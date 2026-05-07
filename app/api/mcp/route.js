// Model Context Protocol — HTTP transport for Filey.
//
// Implements the JSON-RPC 2.0 surface that MCP clients (Claude Desktop /
// Claude Code / Cursor / etc.) use to discover and call tools. Filey is
// offline-first, so the server holds no user data — every tool either runs
// pure logic or relays to /api/extract. Clients pass any required BYOK
// credentials inline (e.g. for `extract_receipt_image`).
//
// Endpoints:
//   POST /api/mcp    JSON-RPC request → JSON-RPC response
//   GET  /api/mcp    Lightweight liveness probe
//
// Auth: optional. If `MCP_TOKEN` is set in the env (or the user generates a
// token in Settings → MCP server), clients must send `Authorization: Bearer
// <token>`. Without the env var, the endpoint is open — appropriate for
// self-host where the user controls network access.

import { TOOLS, runTool } from '@/lib/mcpTools';

export const runtime = 'edge';

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_INFO = { name: 'filey-mcp', version: '1.0.0' };

function jsonRpcResult(id, result) {
  return Response.json({ jsonrpc: '2.0', id, result });
}
function jsonRpcError(id, code, message, data) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } }, { status: 200 });
}

function authOk(req) {
  const need = process.env.MCP_TOKEN;
  if (!need) return true;
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return got && got === need;
}

export async function GET(req) {
  return Response.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocol: PROTOCOL_VERSION,
    transport: 'http',
    tools: TOOLS.map(t => t.name),
    docs: 'https://filey.ae/self-host#mcp',
  });
}

export async function POST(req) {
  if (!authOk(req)) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="filey-mcp"' } });
  }

  let body;
  try { body = await req.json(); } catch { return jsonRpcError(null, -32700, 'Parse error'); }

  // Batch requests
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map((m) => handleSingle(m, req)));
    return Response.json(results.filter(Boolean));
  }

  const out = await handleSingle(body, req);
  if (!out) return new Response(null, { status: 204 }); // notification: no response
  return Response.json(out);
}

async function handleSingle(msg, req) {
  if (!msg || msg.jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id: msg?.id ?? null, error: { code: -32600, message: 'Invalid Request' } };
  }
  const isNotification = msg.id === undefined;

  try {
    const result = await dispatch(msg.method, msg.params || {}, req);
    if (isNotification) return null;
    return { jsonrpc: '2.0', id: msg.id, result };
  } catch (e) {
    if (isNotification) return null;
    const code = e?.code || -32000;
    return { jsonrpc: '2.0', id: msg.id, error: { code, message: String(e?.message || e) } };
  }
}

async function dispatch(method, params, req) {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: {
          tools: { listChanged: false },
          resources: {},
          prompts: {},
        },
      };

    case 'ping':
      return {};

    case 'tools/list':
      return {
        tools: TOOLS.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };

    case 'tools/call': {
      const { name, arguments: args = {} } = params || {};
      if (!name) throw Object.assign(new Error('Missing tool name'), { code: -32602 });
      const url = new URL(req.url);
      const origin = `${url.protocol}//${url.host}`;
      const out = await runTool(name, args, { origin });
      return {
        content: [{ type: 'text', text: typeof out === 'string' ? out : JSON.stringify(out, null, 2) }],
        isError: false,
        structuredContent: typeof out === 'object' ? out : undefined,
      };
    }

    case 'resources/list':
      return { resources: [] };

    case 'prompts/list':
      return { prompts: [] };

    default:
      throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type',
    },
  });
}
