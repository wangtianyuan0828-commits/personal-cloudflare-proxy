# Personal Cloudflare Workers test profile

Source: zizifn/edgetunnel, pinned from commit
44b9377986b6545517908cc3e2b52211aad10945. GPL-2.0; see LICENSE.
This is a test profile, not an independent security audit or a guarantee of safety,
speed or availability. This public repository must never contain private credentials.

## Deployment

Cloudflare Workers and Pages > Create application > Connect GitHub. Grant access
to this repository only, select it, and use:

- Build command: empty.
- Deploy command: `npx wrangler deploy`.
- Root directory: `/`.
- Worker entry: `src/personal-entry.mjs` (from wrangler.toml).

After deployment add a unique UUID v4 as a **Secret** named `UUID` in Cloudflare
Settings > Variables and Secrets. Missing, malformed and upstream-example UUIDs
deliberately return 503. Never put a real UUID, upstream password or API token in GitHub.

Bind a subdomain under the separate test domain. Configure a compatible client
with VLESS, TLS, port 443, WebSocket path `/tunnel`, the private UUID, and the custom
hostname as SNI and Host. Keep certificate verification enabled; disable early data/0-RTT.
`/health` confirms configuration only, not outbound connectivity.

## Changes and limits

The deployment entry requires HTTPS and a private credential, rejects URL override
parameters and early-data headers, and exposes no HTTP UUID/configuration export
route or administration panel. Transport logs and Worker observability are disabled.
The first TCP dial is awaited to prevent a race with subsequent client frames.
No public converter, remote panel or built-in third-party fallback is used.

This initial profile does **not** implement an ISP SOCKS5/HTTP chain and does not
promise a US, residential, exclusive or fixed exit IP. PROXYIP, if explicitly set,
is only a trusted retry endpoint, not global ISP egress. Cloudflare blocks raw TCP
connections to its own ranges, so some sites require an independently verified
upstream path. UDP support is DNS-only, through Cloudflare DNS-over-HTTPS.

The user's actual network, speed, reconnect behavior and long transfers have not
yet been tested. Do not use important accounts as the initial connectivity test.
Old source files in this fork are not deployment entries. Do not enable legacy
GitHub Actions workflows or point Wrangler at those unguarded files.

## Local checks

Node 22+: `npm run check` and `npm run test:personal` need no npm installation.
The tests cover configuration gates, not the entire transport or live network.
