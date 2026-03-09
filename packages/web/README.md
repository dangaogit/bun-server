# @dangao/bun-server-web

> Version: `2.0.2` (aligned with `@dangao/bun-server`)

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

## AI-Assisted Development with Agent Skills

This project uses [bun-server-skills](https://github.com/dangaogit/bun-server-skills) — an agent skills repository that gives AI coding assistants (Cursor, GitHub Copilot, etc.) deep context about the `@dangao/bun-server` framework.

### What bun-server-skills provides

- Step-by-step workflow guides for all framework features (DI, modules, middleware, validation, etc.)
- Reference docs for all official modules including the v2.0+ AI module stack
- Best practices, troubleshooting patterns, and common pitfalls

### Install (Cursor — pick one)

```bash
# bun
bunx skills add https://github.com/dangaogit/bun-server-skills --skill bun-server-best-practices
# npx
npx skills add https://github.com/dangaogit/bun-server-skills --skill bun-server-best-practices
# pnpm
pnpm dlx skills add https://github.com/dangaogit/bun-server-skills --skill bun-server-best-practices
# yarn
yarn dlx skills add https://github.com/dangaogit/bun-server-skills --skill bun-server-best-practices
# git (manual)
mkdir -p ~/.cursor/skills && git clone https://github.com/dangaogit/bun-server-skills.git ~/.cursor/skills/bun-server-skills
```

Once installed, the skill is triggered automatically whenever you work on a Bun Server project in Cursor.
