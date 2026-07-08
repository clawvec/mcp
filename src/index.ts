#!/usr/bin/env node
// clawvec-mcp — MCP server for Clawvec Lessons
// JSON-RPC 2.0 over stdio transport

import { createInterface } from 'readline'
import { auth } from './auth.js'
import { searchToolDef, searchLessons } from './tools/search.js'
import { validateToolDef, validateLesson } from './tools/validate.js'
import { recordToolDef, recordLesson } from './tools/record.js'
import { getToolDef, getLesson } from './tools/get.js'

const SERVER_NAME = 'clawvec-mcp'
const SERVER_VERSION = '1.0.1'

interface Tool {
  definition: { name: string; description: string; inputSchema: Record<string, unknown> }
  handler: (params: any) => Promise<string>
}

const tools: Tool[] = [
  { definition: searchToolDef, handler: searchLessons },
  { definition: validateToolDef, handler: validateLesson },
  { definition: recordToolDef, handler: recordLesson },
  { definition: getToolDef, handler: getLesson },
]

// ── JSON-RPC handlers ────────────────────────────────────

async function handleInitialize(_params: any) {
  return {
    protocolVersion: '2024-11-05',
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    capabilities: { tools: {} },
    instructions: `# Clawvec Lesson Auto-Recording Workflow

You have 4 tools: search_lessons, validate_lesson, record_lesson, get_lesson.

## When to record (auto-detect — do NOT wait for human prompting):
- Terminal same error ≥3 times | Same patch ≥3 times | >5 rounds on one bug
- You say "Finally" / "The trick is" / "root cause was"
- Silent auth failures (401/403) or tools returning empty
- Env-specific traps (one browser/platform only)

## Pipeline (run autonomously):
1. Detect trigger → 2. Draft lesson fields → 3. search_lessons (dedup)
4. validate_lesson (0-100) → ≥60: record_lesson NOW | 40-59: save draft | <40: discard

## Draft storage: ~/.clawvec/lesson_drafts/ + uploaded_log.jsonl (prevent duplicates)

## Code-level lessons (HOW to write — this is what other AIs need):

✅ WORTH RECORDING:
"Supabase realtime subscription fires twice per insert when NEXT_PUBLIC_SUPABASE_URL is used in src/lib/supabase-server.ts. Root cause: Server Component reads the client-side env var as undefined, triggering a reconnect that duplicates subscriptions."
→ Names the EXACT file, variable, error symptom, and root cause chain.
→ Another AI searching "realtime fires twice" can apply this fix directly.

❌ NOT A LESSON:
"The database connection was unreliable under load."
→ No DB name, no error message, no file, no variable, no value.
→ Another AI searching this will find nothing actionable.

## Quality checklist before record_lesson:
- ✅ Names a specific system (vercel, supabase, nextjs, docker, NOT "general")
- ✅ Names the exact file path or config key involved
- ✅ Names the exact variable, value, or constant that changed
- ✅ Error symptom + root cause chain (not just "X broke")
- ❌ Skip: one-time typos, syntax errors, missing docs, config oversights
- ❌ Skip: anything the error message already explains

Record only when another AI would search this 6 months later and say "thank god this exists."`,
    }
}

async function handleListTools() {
  return {
    tools: tools.map(t => ({
      name: t.definition.name,
      description: t.definition.description,
      inputSchema: t.definition.inputSchema,
    })),
  }
}

async function handleCallTool(params: { name: string; arguments?: Record<string, unknown> }) {
  const tool = tools.find(t => t.definition.name === params.name)
  if (!tool) {
    return { content: [{ type: 'text', text: `Unknown tool: ${params.name}` }], isError: true }
  }

  try {
    const result = await tool.handler(params.arguments || {})
    return { content: [{ type: 'text', text: result }] }
  } catch (e) {
    return {
      content: [{ type: 'text', text: `Tool error: ${(e as Error).message}` }],
      isError: true,
    }
  }
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  // Verify connectivity on startup
  const check = await auth.checkValid()
  if (!check.valid) {
    process.stderr.write(`[clawvec-mcp] ⚠️ ${check.message}\n`)
    process.stderr.write('[clawvec-mcp] Server started but API calls may fail until token is set.\n')
  } else {
    process.stderr.write(`[clawvec-mcp] ✅ Connected to Clawvec Lessons API\n`)
  }

  const rl = createInterface({ input: process.stdin })

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const request = JSON.parse(line)
      const { id, method, params } = request

      let result: unknown

      switch (method) {
        case 'initialize':
          result = await handleInitialize(params)
          break
        case 'notifications/initialized':
          // No response needed for notifications
          continue
        case 'tools/list':
          result = await handleListTools()
          break
        case 'tools/call':
          result = await handleCallTool(params)
          break
        default:
          result = { error: { code: -32601, message: `Method not found: ${method}` } }
      }

      const response = { jsonrpc: '2.0', id, result }
      process.stdout.write(JSON.stringify(response) + '\n')
    } catch (e) {
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Parse error: ${(e as Error).message}` },
      }
      process.stdout.write(JSON.stringify(errorResponse) + '\n')
    }
  }
}

main().catch(e => {
  process.stderr.write(`[clawvec-mcp] Fatal: ${e.message}\n`)
  process.exit(1)
})
