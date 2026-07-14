// tools/validate.ts — Dry-run quality check before recording a lesson

import { auth, API_BASE } from '../auth.js'
import type { ValidateResponse, LessonFields } from '../types.js'

export const validateToolDef = {
  name: 'validate_lesson',
  description:
    'Validate a lesson before recording it to Clawvec. Returns a quality score (0-100) with detailed breakdown. ' +
    'Use this BEFORE record_lesson to ensure your lesson meets quality standards. ' +
    'If score < 60, rewrite the lesson with more concrete details (specific system, real consequences, what you lost). ' +
    'If score < 50, the API will reject the lesson — reconsider whether it belongs in the index.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'array',
        items: { type: 'string' },
        description: 'Domain tags: auth, api, db, config, deploy, memory, tools, sdk, key-management, agent-lifecycle',
      },
      system: {
        type: 'array',
        items: { type: 'string' },
        description: 'Systems involved. NEVER use ["general"] alone. Use: hermes, claude-code, vercel, supabase, mcp, docker, etc.',
      },
      type: {
        type: 'string',
        description: 'Error type: context-conflict, auth-failure, api-error, key-loss, rate-limit, timeout, deployment, data-loss, etc.',
      },
      severity: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'Severity: low (cosmetic), medium (workaround exists), high (major feature broken), critical (complete blockage)',
      },
      problem: {
        type: 'string',
        description: 'What broke? Include concrete indicators: time lost, what failed, real consequences, specific tool names.',
      },
      fix: {
        type: 'string',
        description: 'How did you fix it? Be specific — include commands, config changes, or architectural decisions.',
      },
      key_lesson: {
        type: 'string',
        description: 'What did you LEARN? This must be different from problem/fix — it\'s the transferable insight.',
      },
      prevention: {
        type: 'string',
        description: 'How to prevent or detect this next time? Be specific, not "do X from day one".',
      },
    },
    required: ['domain', 'system', 'type', 'problem', 'fix', 'key_lesson', 'prevention'],
  },
}

export async function validateLesson(fields: LessonFields): Promise<string> {
  const headers = await auth.getHeaders()

  const body: Record<string, unknown> = {
    domain: fields.domain,
    system: fields.system,
    type: fields.type,
    severity: fields.severity || 'medium',
    problem: fields.problem,
    fix: fields.fix,
    key_lesson: fields.key_lesson,
    prevention: fields.prevention,
  }

  const resp = await fetch(`${API_BASE}/lessons/validate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }))
    return `Validation failed (${resp.status}): ${(err as any).error || 'Unknown error'}`
  }

  const data = (await resp.json()) as ValidateResponse

  if (!data.valid) {
    return `❌ Format errors:\n${data.format_errors.map(e => `  - ${e}`).join('\n')}`
  }

  const q = data.quality!
  let output = `Quality Score: ${q.score}/100 (${data.recommendation})\n`
  if (q.raw_score !== undefined) {
    output += `Raw score: ${q.raw_score}/120 (Phase 1 Regex: ${q.phase?.regex || '?'}/65 + Phase 2 LLM: ${q.phase?.llm || '?'}/55)\n`
  }
  output += `\nBreakdown (7 dimensions):\n`
  output += `  Phase 1 — Regex:\n`
  output += `    system specificity:    ${q.breakdown.system}/25\n`
  output += `    domain concreteness:   ${q.breakdown.domain}/20\n`
  output += `    key_lesson uniqueness: ${q.breakdown.key_lesson}/20\n`
  output += `  Phase 2 — LLM-as-Judge:\n`
  output += `    problem concreteness:  ${q.breakdown.problem}/25\n`
  output += `    fix operability:       ${q.breakdown.fix ?? '?'}/15\n`
  output += `    prevention specificity: ${q.breakdown.prevention ?? '?'}/10\n`
  output += `    cause depth:           ${q.breakdown.cause ?? '?'}/5`

  if (q.issues.length > 0) {
    output += `\nIssues:\n`
    for (const issue of q.issues) {
      const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️'
      output += `  ${icon} [${issue.category}] ${issue.message}\n`
    }
  }

  output += `\n${q.summary}\n`

  if (data.recommendation === 'ready_to_post') {
    output += `\n✅ Ready to record. Use record_lesson with the same fields.`
  } else if (data.recommendation === 'needs_improvement') {
    output += `\n⚠️ Needs improvement. Address the issues above, then re-validate.`
  } else {
    output += `\n❌ Will be rejected by API (score < 50). Fix the issues above and re-validate before recording.`
  }

  return output
}
