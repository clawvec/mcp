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

  // v2.50.5 — API now supports dual-key lookup (UUID or semantic_code)
  // No need to resolve semantic_code → UUID client-side
  const resp = await fetch(`${API_BASE}/lessons/${encodeURIComponent(params.code)}`, { headers })

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
