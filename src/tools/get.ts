// tools/get.ts — Get a single lesson detail with variants

import { auth, API_BASE } from '../auth.js'
import type { GetDetailResponse } from '../types.js'

export const getToolDef = {
  name: 'get_lesson',
  description:
    'Get full details of a specific Clawvec lesson by its Semantic Code or ID. ' +
    'Returns the complete lesson including causes, prevention, contributions, and variant lessons.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      code: {
        type: 'string',
        description: 'The lesson\'s semantic_code (e.g., AUTH-KEY-MANAGEMENT-001) or UUID id',
      },
    },
    required: ['code'],
  },
}

export async function getLesson(params: { code: string }): Promise<string> {
  const headers = await auth.getHeaders()

  // Try semantic_code first (GET /api/lessons?q=code), then by ID
  let id = params.code

  // If it looks like a semantic code (contains hyphens and letters), search for it
  if (/[A-Z]+-/.test(params.code) && !params.code.includes('-') === false) {
    const searchParams = new URLSearchParams({ q: params.code, limit: '1' })
    const searchResp = await fetch(`${API_BASE}/lessons?${searchParams}`, { headers })
    if (searchResp.ok) {
      const searchData = await searchResp.json() as { lessons: { id: string; semantic_code: string }[] }
      const match = searchData.lessons?.find(
        l => l.semantic_code === params.code || l.semantic_code.startsWith(params.code)
      )
      if (match) id = match.id
    }
  }

  const resp = await fetch(`${API_BASE}/lessons/${id}`, { headers })

  if (!resp.ok) {
    return `Lesson not found: ${params.code}`
  }

  const data = (await resp.json()) as GetDetailResponse
  const l = data.lesson

  let output = `# ${l.semantic_code}\n\n`
  output += `**Status:** ${l.status} | **Severity:** ${l.severity.toUpperCase()} | 👍${l.usefulness_score} ✅${l.verified_count}\n\n`
  output += `**Problem:** ${l.problem}\n\n`
  if (l.cause?.length) output += `**Causes:** ${l.cause.join('; ')}\n\n`
  output += `**Fix:** ${l.fix}\n\n`
  output += `**Key Lesson:** ${l.key_lesson}\n\n`
  output += `**Prevention:** ${l.prevention}\n\n`
  output += `**Systems:** ${l.system.join(', ')} | **Domains:** ${l.domain.join(', ')}\n`
  if (l.dispute_reason) output += `**Dispute reason:** ${l.dispute_reason}\n`
  output += `**Created:** ${l.created_at}\n`

  if (data.variants?.length) {
    output += `\n**Variants (${data.variants.length}):**\n`
    for (const v of data.variants) {
      output += `  - ${v.semantic_code}: ${v.problem.slice(0, 100)}\n`
    }
  }

  if (l.contributions?.length) {
    output += `\n**Contributions (${l.contributions.length}):**\n`
    for (const c of l.contributions) {
      output += `  - [${c.type}] ${c.content.slice(0, 120)}\n`
    }
  }

  return output
}
