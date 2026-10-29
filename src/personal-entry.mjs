// Configuration safeguards for a personal test deployment; not a security audit.
import transport from './worker-vless.js';
const sampleUUID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
export default {
  async fetch(request, env, ctx) {
    const uuid = typeof env.UUID === 'string' ? env.UUID.trim().toLowerCase() : '';
    if (!uuidV4.test(uuid) || uuid === sampleUUID) return new Response('Configure a private UUID v4 secret before use.', { status: 503, headers });
    const url = new URL(request.url);
    if (url.protocol !== 'https:') return new Response('HTTPS required.', { status: 426, headers });
    if (request.method === 'GET' && url.pathname === '/health' && !request.headers.has('Upgrade')) return new Response('Worker configured; outbound connectivity has not been verified.', { headers });
    if (request.method !== 'GET' || url.pathname !== '/tunnel' || url.search || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Not found.', { status: 404, headers });
    // Keep authentication bytes out of URL paths and early-data protocol headers.
    if (request.headers.has('Sec-WebSocket-Protocol')) return new Response('Early data is disabled.', { status: 400, headers });
    try {
      return await transport.fetch(request, { UUID: uuid, PROXYIP: env.PROXYIP || '' }, ctx);
    } catch {
      return new Response('Tunnel unavailable.', { status: 502, headers });
    }
  }
};
