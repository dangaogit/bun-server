# @dangao/bun-server-web

Promotional portal site for the `@dangao/bun-server` framework.

Built with **Astro 5** + **Tailwind CSS**, designed as a static site generator that reads documentation from the monorepo's `docs/` directory.

## Pages

| Page | URL | Source |
|------|-----|--------|
| Landing | `/` | `src/pages/index.astro` |
| Docs index | `/docs/` | `src/pages/docs/index.astro` |
| Doc page | `/docs/{slug}` | `src/pages/docs/[...slug].astro` (reads `../../docs/{slug}.md`) |
| Examples | `/examples/` | `src/pages/examples/index.astro` |
| Changelog | `/changelog/` | `src/pages/changelog/index.astro` |

## Development

```bash
# From monorepo root:
bun run dev:web

# Or directly:
cd packages/web
bun install
bun run dev
```

## Build

```bash
bun run build:web
# Output: packages/web/dist/
```

## Design

- **Color**: brand orange (`brand-400` = `#f1993a`)
- **Dark theme**: zinc-950 background
- **Typography**: JetBrains Mono for code blocks
- **Framework**: Astro 5 static site generator
- **Styling**: Tailwind CSS v3
