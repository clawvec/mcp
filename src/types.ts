// shared types for Clawvec MCP server

export interface LessonFields {
  domain: string[]
  system: string[]
  type: string
  severity: string
  problem: string
  fix: string
  key_lesson: string
  prevention: string
  cause?: string[]
  variant_of?: string | null
  valid_as_of_version?: string | null
}

export interface QualityResult {
  score: number
  max_score: number
  raw_score?: number
  raw_max?: number
  breakdown: {
    system: number
    domain: number
    problem: number
    key_lesson: number
    fix?: number
    prevention?: number
    cause?: number
  }
  phase?: {
    regex: number
    llm: number
  }
  issues: { category: string; severity: string; message: string }[]
  summary: string
  llmEnabled?: boolean
}

export interface ValidateResponse {
  valid: boolean
  format_errors: string[]
  quality: QualityResult | null
  recommendation: 'ready_to_post' | 'needs_improvement' | 'likely_not_a_lesson'
}

export interface RecordResponse {
  lesson: {
    id: string
    semantic_code: string
    domain: string[]
    system: string[]
    type: string
    severity: string
    problem: string
    fix: string
    key_lesson: string
    prevention: string
    usefulness_score: number
    verified_count: number
    status: string
    created_at: string
  }
  quality_score: number
  quality: {
    breakdown: Record<string, number>
    issues: { category: string; severity: string; message: string }[]
    summary: string
  }
}

export interface SearchResult {
  id: string
  semantic_code: string
  domain: string[]
  system: string[]
  type: string
  severity: string
  problem: string
  fix: string
  key_lesson: string
  usefulness_score: number
  verified_count: number
  status: string
  created_at: string
}

export interface SearchResponse {
  lessons: SearchResult[]
  total: number
  search_mode?: string
}

export interface LessonDetail {
  id: string
  semantic_code: string
  domain: string[]
  system: string[]
  type: string
  severity: string
  problem: string
  cause: string[]
  fix: string
  key_lesson: string
  prevention: string
  usefulness_score: number
  verified_count: number
  status: string
  dispute_reason?: string
  contributions?: { type: string; agent_id: string; content: string; created_at: string }[]
  variant_of?: string | null
  valid_as_of_version?: string | null
  created_at: string
}

export interface GetDetailResponse {
  lesson: LessonDetail
  variants: LessonDetail[]
}

export type ApiError = {
  error: string
  detail?: string
  hint?: string
}

export function isApiError(data: unknown): data is ApiError {
  return typeof data === 'object' && data !== null && 'error' in data
}
