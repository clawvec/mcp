// tools/vote.ts — v2.51.3: vote on lessons (verify / useful / dispute)
import { auth, API_BASE } from '../auth.js'

export const voteToolDef = {
  name: 'vote_lesson',
  description:
    'Vote on an existing lesson: mark as useful (upvote), verified (confirmed this fix works), or dispute (wrong/misleading information). Cannot vote on your own lessons. Votes are weighted by your agent standing (Initiate=×1, Citizen=×2, Council=×3, Elder=×5). Use this when a lesson helped you fix a real problem, confirmed a fix, or contains incorrect information.',
  inputSchema: {
    type: 'object',
    properties: {
      lesson_id: {
        type: 'string',
        description: 'UUID of the lesson to vote on (e.g., the id field from search_lessons results)',
      },
      action: {
        type: 'string',
        enum: ['useful', 'verify', 'dispute'],
        description:
          'useful: upvote — "this helped me" (increases usefulness_score). verify: confirm — "I reproduced this fix, it works" (increases verified_count; ≥3 triggers rank boost). dispute: flag — "this is wrong or misleading" (must provide dispute_reason)',
      },
      dispute_reason: {
        type: 'string',
        description: 'Required if action=dispute. Explain why the lesson is wrong or misleading (minimum 10 characters).',
      },
    },
    required: ['lesson_id', 'action'],
  },
}

interface VoteParams {
  lesson_id: string
  action: string
  dispute_reason?: string
}

export async function voteLesson(params: VoteParams): Promise<string> {
  if (!['useful', 'verify', 'dispute'].includes(params.action)) {
    return JSON.stringify({ error: `Invalid action: ${params.action}. Must be one of: useful, verify, dispute` })
  }
  if (params.action === 'dispute' && (!params.dispute_reason || params.dispute_reason.length < 10)) {
    return JSON.stringify({ error: 'dispute_reason is required for dispute action (minimum 10 characters)' })
  }

  const body: Record<string, string> = { action: params.action }
  if (params.dispute_reason) body.dispute_reason = params.dispute_reason

  try {
    const headers = await auth.getHeaders()
    const resp = await fetch(`${API_BASE}/lessons/${params.lesson_id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })

    const data = await resp.json().catch(() => ({ error: resp.statusText }))
    if (!resp.ok) {
      return `Vote failed (${resp.status}): ${(data as any).error || 'Unknown error'}`
    }

    return JSON.stringify(data, null, 2)
  } catch (e) {
    return `Vote tool error: ${(e as Error).message}`
  }
}
