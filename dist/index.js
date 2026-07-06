#!/usr/bin/env node
// clawvec-mcp — MCP server for Clawvec Lessons
// JSON-RPC 2.0 over stdio transport
import { createInterface } from 'readline';
import { auth } from './auth.js';
import { searchToolDef, searchLessons } from './tools/search.js';
import { validateToolDef, validateLesson } from './tools/validate.js';
import { recordToolDef, recordLesson } from './tools/record.js';
import { getToolDef, getLesson } from './tools/get.js';
const SERVER_NAME = 'clawvec-mcp';
const SERVER_VERSION = '1.0.0';
const tools = [
    { definition: searchToolDef, handler: searchLessons },
    { definition: validateToolDef, handler: validateLesson },
    { definition: recordToolDef, handler: recordLesson },
    { definition: getToolDef, handler: getLesson },
];
// ── JSON-RPC handlers ────────────────────────────────────
async function handleInitialize(_params) {
    return {
        protocolVersion: '2024-11-05',
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        capabilities: { tools: {} },
    };
}
async function handleListTools() {
    return {
        tools: tools.map(t => ({
            name: t.definition.name,
            description: t.definition.description,
            inputSchema: t.definition.inputSchema,
        })),
    };
}
async function handleCallTool(params) {
    const tool = tools.find(t => t.definition.name === params.name);
    if (!tool) {
        return { content: [{ type: 'text', text: `Unknown tool: ${params.name}` }], isError: true };
    }
    try {
        const result = await tool.handler(params.arguments || {});
        return { content: [{ type: 'text', text: result }] };
    }
    catch (e) {
        return {
            content: [{ type: 'text', text: `Tool error: ${e.message}` }],
            isError: true,
        };
    }
}
// ── Main ─────────────────────────────────────────────────
async function main() {
    // Verify connectivity on startup
    const check = await auth.checkValid();
    if (!check.valid) {
        process.stderr.write(`[clawvec-mcp] ⚠️ ${check.message}\n`);
        process.stderr.write('[clawvec-mcp] Server started but API calls may fail until token is set.\n');
    }
    else {
        process.stderr.write(`[clawvec-mcp] ✅ Connected to Clawvec Lessons API\n`);
    }
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) {
        if (!line.trim())
            continue;
        try {
            const request = JSON.parse(line);
            const { id, method, params } = request;
            let result;
            switch (method) {
                case 'initialize':
                    result = await handleInitialize(params);
                    break;
                case 'notifications/initialized':
                    // No response needed for notifications
                    continue;
                case 'tools/list':
                    result = await handleListTools();
                    break;
                case 'tools/call':
                    result = await handleCallTool(params);
                    break;
                default:
                    result = { error: { code: -32601, message: `Method not found: ${method}` } };
            }
            const response = { jsonrpc: '2.0', id, result };
            process.stdout.write(JSON.stringify(response) + '\n');
        }
        catch (e) {
            const errorResponse = {
                jsonrpc: '2.0',
                id: null,
                error: { code: -32700, message: `Parse error: ${e.message}` },
            };
            process.stdout.write(JSON.stringify(errorResponse) + '\n');
        }
    }
}
main().catch(e => {
    process.stderr.write(`[clawvec-mcp] Fatal: ${e.message}\n`);
    process.exit(1);
});
