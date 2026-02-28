FROM oven/bun:1.3.10
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/bun-server/package.json packages/bun-server/
COPY packages/logsmith/package.json packages/logsmith/
COPY packages/nacos-client/package.json packages/nacos-client/
COPY benchmark/package.json benchmark/

RUN bun install --ignore-scripts

COPY packages/ packages/
COPY benchmark/wrk-server.ts benchmark/
COPY tsconfig.json ./

ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "benchmark/wrk-server.ts"]
