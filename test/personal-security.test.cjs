const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const source = readFileSync(resolve(__dirname, '../src/personal-entry.mjs'), 'utf8');
const uuid = 'a1b2c3d4-e5f6-4789-8123-456789abcdef'; // Synthetic test data only.
function load() {
  const calls = [];
  const context = vm.createContext({ URL, Response, transport: { async fetch(...args) { calls.push(args); return new Response('transport stub'); } } });
  vm.runInContext(source.replace("import transport from './worker-vless.js';", '').replace('export default {', 'globalThis.worker = {'), context);
  return { worker: context.worker, calls };
}
function request(path, options = {}) { return new Request('https://example.invalid' + path, options); }
test('unset, malformed and public example UUID cannot enable the transport', async () => {
  for (const value of [undefined, '', 'not-a-uuid', 'd342d11e-d424-4583-b36e-524ab1f0afa4']) {
    const { worker, calls } = load();
    assert.equal((await worker.fetch(request('/tunnel', { headers: { Upgrade: 'websocket' } }), { UUID: value }, {})).status, 503);
    assert.equal(calls.length, 0);
  }
});
test('HTTP, old secret-in-path export routes and query overrides stay closed', async () => {
  const { worker, calls } = load();
  for (const path of ['/', '/' + uuid, '/sub', '/tunnel?proxyip=untrusted.invalid']) {
    const result = await worker.fetch(request(path), { UUID: uuid }, {});
    assert.equal(result.status, 404);
    assert.ok(!(await result.text()).includes(uuid));
  }
  assert.equal((await worker.fetch(new Request('http://example.invalid/tunnel'), { UUID: uuid }, {})).status, 426);
  assert.equal(calls.length, 0);
});
test('health reports configuration only and never a credential', async () => {
  const { worker } = load();
  const result = await worker.fetch(request('/health'), { UUID: uuid }, {});
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.ok(!(await result.text()).includes(uuid));
});
test('early-data headers and URL override parameters never reach transport', async () => {
  const { worker, calls } = load();
  assert.equal((await worker.fetch(request('/tunnel', { headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'encoded-credential' } }), { UUID: uuid }, {})).status, 400);
  assert.equal((await worker.fetch(request('/tunnel?proxyip=untrusted.invalid', { headers: { Upgrade: 'websocket' } }), { UUID: uuid }, {})).status, 404);
  assert.equal(calls.length, 0);
});
test('only the fixed WS route invokes transport with the configured private UUID', async () => {
  const { worker, calls } = load();
  assert.equal((await worker.fetch(request('/tunnel', { headers: { Upgrade: 'websocket' } }), { UUID: uuid.toUpperCase(), PROXYIP: '192.0.2.1' }, {})).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].UUID, uuid);
  assert.equal(calls[0][1].PROXYIP, '192.0.2.1');
});
