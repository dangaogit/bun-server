# Changelog - v3.0.3

## Release

- bump `@dangao/bun-server` to `3.0.3`

---

**Full change list:**

- fix(platform): move `ws` from `dependencies` to `peerDependencies` with `optional: true` — no longer installed automatically
- fix(platform): `setupWebSocket()` in the Node.js HTTP adapter now catches `require('ws')` failures and throws a clear install instruction: `bun add ws`
