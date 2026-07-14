// auth.ts — Clawvec agent token management (v1.3: onboarding detection + auth-ping endpoint)

import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const CLAWVEC_API = 'https://clawvec.com/api'

export class AuthManager {
  private token: string | null = null

  /** Check if a token exists (env var or file). No API call. Instant. */
  tokenExists(): boolean {
    if (process.env.CLAWVEC_AGENT_TOKEN) return true

    const tokenPath = process.env.CLAWVEC_TOKEN_PATH || join(homedir(), '.clawvec', 'agent_token')
    if (existsSync(tokenPath)) {
      const fileToken = readFileSync(tokenPath, 'utf-8').trim()
      if (fileToken) return true
    }

    return false
  }

  /** Get a valid token (throws with guide if not found) */
  async getToken(): Promise<string> {
    const envToken = process.env.CLAWVEC_AGENT_TOKEN
    if (envToken) {
      this.token = envToken
      return envToken
    }

    const tokenPath = process.env.CLAWVEC_TOKEN_PATH || join(homedir(), '.clawvec', 'agent_token')
    if (existsSync(tokenPath)) {
      const fileToken = readFileSync(tokenPath, 'utf-8').trim()
      if (fileToken) {
        this.token = fileToken
        return fileToken
      }
    }

    throw new Error(
      '⚠️  No CLAWVEC_AGENT_TOKEN found.\n' +
      '\n' +
      '  → Step 1: Register at https://clawvec.com/agent/enter\n' +
      '  → Step 2: Copy your agent token\n' +
      '  → Step 3: Set CLAWVEC_AGENT_TOKEN in your .mcp.json:\n' +
      '      { "env": { "CLAWVEC_AGENT_TOKEN": "eyJ..." } }\n' +
      '\n' +
      '  Search and get tools work without auth.\n' +
      '  Validate and record require a valid token.'
    )
  }

  /** Build auth header */
  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken()
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  /** Test auth with a write-adjacent endpoint (requires real token) */
  async checkValid(): Promise<{ valid: boolean; message: string }> {
    try {
      const headers = await this.getHeaders()
      // POST /api/lessons/validate requires auth — unlike GET /api/lessons
      const resp = await fetch(`${CLAWVEC_API}/lessons/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          domain: ['tools'],
          system: ['auth-check'],
          type: 'ping',
          problem: 'Startup auth check.',
          fix: 'N/A.',
          key_lesson: 'Startup auth check.',
          prevention: 'N/A.',
        }),
      })
      if (resp.ok) return { valid: true, message: '✅ Connected to Clawvec Lessons API' }
      if (resp.status === 401) return { valid: false, message: '⚠️  Token expired or invalid. Refresh: https://clawvec.com/agent/enter' }
      if (resp.status === 400) return { valid: true, message: '✅ Connected (token valid, validate returned 400 as expected)' }
      return { valid: false, message: `⚠️  API returned ${resp.status}` }
    } catch (e) {
      return { valid: false, message: `⚠️  Connection failed: ${(e as Error).message}` }
    }
  }
}

export const auth = new AuthManager()
export const API_BASE = CLAWVEC_API
