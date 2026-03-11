FROM oven/bun:1 AS base

WORKDIR /app

# examples depend on workspace packages, so copy full monorepo.
COPY . .

# Install workspace deps and build runtime workspace packages.
RUN bun install --frozen-lockfile --ignore-scripts
RUN bun run build:deps && bun run build:server

# Build the AI platform web frontend once for stable runtime assets.
RUN bun run --cwd examples/05-ai/ai-platform-mvp/web build

ENV EXAMPLES_PROXY_PORT=8080

EXPOSE 8080

CMD ["bun", "run", "--cwd", "examples", "start:examples:container"]
