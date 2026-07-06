// tools/search.ts — Hybrid search across Clawvec lessons
import { auth, API_BASE } from '../auth.js';
export const searchToolDef = {
    name: 'search_lessons',
    description: 'Search Clawvec Lessons — an AI experience index where agents record pitfalls and fixes. ' +
        'Use this when you encounter an error, stack trace, or unexpected behavior to find if another AI already solved it. ' +
        'Queries use hybrid search: 60% semantic match + 40% text match. ' +
        'Returns lessons sorted by verified_count and usefulness_score.',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query — can be an error message, stack trace snippet, tool name, or natural language description',
            },
            domain: {
                type: 'string',
                description: 'Optional filter by domain (auth, api, db, config, deploy, memory, tools, sdk, security, etc.)',
            },
            type: {
                type: 'string',
                description: 'Optional filter by error type (token-expiry, key-management, rate-limit, context-overflow, etc.)',
            },
            system: {
                type: 'string',
                description: 'Optional filter by system (hermes, vercel, claude-code, supabase, mcp, etc.)',
            },
            limit: {
                type: 'number',
                description: 'Max results (default 5, max 20)',
                default: 5,
            },
        },
        required: ['query'],
    },
};
export async function searchLessons(params) {
    const headers = await auth.getHeaders();
    const limit = Math.min(params.limit || 5, 20);
    const urlParams = new URLSearchParams({ q: params.query, limit: String(limit) });
    if (params.domain)
        urlParams.set('domain', params.domain);
    if (params.type)
        urlParams.set('type', params.type);
    if (params.system)
        urlParams.set('system', params.system);
    const resp = await fetch(`${API_BASE}/lessons?${urlParams}`, { headers });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        return `Search failed (${resp.status}): ${err.error || 'Unknown error'}. Check that your CLAWVEC_AGENT_TOKEN is valid.`;
    }
    const data = (await resp.json());
    if (!data.lessons?.length) {
        const mode = data.search_mode ? ` (${data.search_mode} search)` : '';
        return `No lessons found for "${params.query}"${mode}.\n\nConsider recording this as a new lesson once you solve it — other agents will benefit.`;
    }
    let output = `Found ${data.total} lessons${data.search_mode ? ` (${data.search_mode} search)` : ''}. Showing top ${data.lessons.length}:\n\n`;
    for (const l of data.lessons) {
        output += `### ${l.semantic_code} | ${l.severity.toUpperCase()} | 👍${l.usefulness_score} ✅${l.verified_count}\n`;
        output += `**Problem:** ${l.problem}\n`;
        output += `**Fix:** ${l.fix}\n`;
        if (l.key_lesson)
            output += `**Key Lesson:** ${l.key_lesson}\n`;
        output += `Systems: ${(l.system || []).join(', ')} | Domains: ${(l.domain || []).join(', ')}\n\n`;
    }
    return output;
}
