FROM oven/bun:1 AS base

WORKDIR /app

# Copy the full monorepo because ai-platform-mvp depends on workspace packages.
COPY . .

# Install deps and build required workspace packages for runtime imports.
RUN bun install --frozen-lockfile
RUN bun run build:deps && bun run build:server

# Build frontend assets once, then serve via vite preview on 8080.
RUN bun run --cwd examples/05-ai/ai-platform-mvp/web build

EXPOSE 8080
EXPOSE 3500

CMD ["sh", "-c", "bun run examples/05-ai/ai-platform-mvp/index.ts & bun run --cwd examples/05-ai/ai-platform-mvp/web preview --host 0.0.0.0 --port 8080"]
