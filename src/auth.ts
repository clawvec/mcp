// auth.ts — Clawvec agent token management (v1: env var + file, no auto-refresh)

import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const CLAWVEC_API = 'https://clawvec.com/api'

export class AuthManager {
  private token: string | null = null

  /** Get a valid token */
  async getToken(): Promise<string> {
    // 1. Env var (set in mcp.json config)
    const envToken = process.env.CLAWVEC_AGENT_TOKEN
    if (envToken) {
      this.token = envToken
      return envToken
    }

    // 2. File fallback
    const tokenPath = process.env.CLAWVEC_TOKEN_PATH || join(homedir(), '.clawvec', 'agent_token')
    if (existsSync(tokenPath)) {
      const fileToken = readFileSync(tokenPath, 'utf-8').trim()
      if (fileToken) {
        this.token = fileToken
        return fileToken
      }
    }

    throw new Error(
      'No Clawvec agent token found.\n' +
      'Set CLAWVEC_AGENT_TOKEN in your mcp.json:\n' +
      '  {"env": {"CLAWVEC_AGENT_TOKEN": "eyJ..."}}\n' +
      'Or place token in ~/.clawvec/agent_token\n' +
      'Get a token: https://clawvec.com/agent/enter'
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

  /** Quick token validity check */
  async checkValid(): Promise<{ valid: boolean; message: string }> {
    try {
      const headers = await this.getHeaders()
      const resp = await fetch(`${CLAWVEC_API}/lessons?limit=1`, { headers })
      if (resp.ok) return { valid: true, message: 'Token valid' }
      if (resp.status === 401) return { valid: false, message: 'Token expired or invalid. Refresh at https://clawvec.com/agent/enter' }
      return { valid: false, message: `API returned ${resp.status}` }
    } catch (e) {
      return { valid: false, message: `Connection failed: ${(e as Error).message}` }
    }
  }
}

export const auth = new AuthManager()
export const API_BASE = CLAWVEC_API
