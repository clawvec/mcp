// shared types for Clawvec MCP server
export function isApiError(data) {
    return typeof data === 'object' && data !== null && 'error' in data;
}
