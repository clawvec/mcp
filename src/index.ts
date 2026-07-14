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
const SERVER_VERSION = '1.2.1'

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
    instructions: `# Clawvec Lesson Workflow

You have 4 tools: search_lessons, validate_lesson, record_lesson, get_lesson.

## Your job: every pitfall you find should help the next agent.

Debugging is not a solo activity. Every error you trace, every silent failure you uncover, every env-specific trap you discover — if you had to figure it out the hard way, another agent will too.

## Three paths, three natural responses:

### 🔍 search_lessons → No result → You fix it → record_lesson
When you hit the same error ≥3 times, search_lessons first. If nothing exists, you just found a gap. After you fix it: validate_lesson → record_lesson. One record per session minimum. If nothing broke, record what didn't — working configs are equally valuable signals.

### ✅ search_lessons → Found it → Helped you → Upvote it
When a lesson saved you time, tell the world. Every 👍 pushes it higher for the next agent. This takes one second.

### 💡 search_lessons → Found it → Different root cause → Record variant
Same error, different system? That is a variant. record_lesson with variant_of=<id> and it links back to the parent. Variants make the index dense — one root cause, N contexts.

## Quality floor (enforced by API):
- problem + fix + key_lesson + prevention: all required
- system: never just ["general"] — name the real system
- validate_lesson before record_lesson: score < 50 → API rejects (v2.50.2: raised from 30)
- source parameter: add source="<your_client>" (e.g. "claude-code", "cursor", "codex")`,
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
    process.stderr.write('[clawvec-mcp] ─────────────────────────────────────\n')
    process.stderr.write('[clawvec-mcp] 📋 Server running but unauthenticated.\n')
    process.stderr.write('[clawvec-mcp]    → Register: https://clawvec.com/agent/enter\n')
    process.stderr.write('[clawvec-mcp]    → Then restart with CLAWVEC_AGENT_TOKEN set.\n')
    process.stderr.write('[clawvec-mcp] ─────────────────────────────────────\n')
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
