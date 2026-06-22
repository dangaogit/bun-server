import { afterEach, describe, expect, test } from 'bun:test';
import { NacosClient, NacosConfigClient, NacosServiceClient } from '../src/index';

type MockServer = ReturnType<typeof Bun.serve>;

const servers: MockServer[] = [];

afterEach(() => {
  while (servers.length > 0) {
    servers.pop()?.stop(true);
  }
});

function startMockServer(
  handler: (req: Request) => Response | Promise<Response>,
): { port: number; getLastUrl: () => string | undefined; getLastBody: () => string | undefined } {
  let lastUrl: string | undefined;
  let lastBody: string | undefined;

  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(req) {
      lastUrl = req.url;
      lastBody = req.method === 'GET' || req.method === 'DELETE' ? undefined : await req.text();
      return handler(req);
    },
  });

  servers.push(server);

  return {
    port: server.port!,
    getLastUrl: () => lastUrl,
    getLastBody: () => lastBody,
  };
}

function createClients(port: number) {
  const client = new NacosClient({
    serverList: [`http://127.0.0.1:${port}`],
    retryCount: 0,
  });

  return {
    config: new NacosConfigClient(client),
    service: new NacosServiceClient(client),
  };
}

describe('public namespace (Nacos 3.x)', () => {
  test('getConfig reads config when namespaceId is omitted (public namespace)', async () => {
    const mock = startMockServer((req) => {
      const url = new URL(req.url);
      if (!url.searchParams.has('namespaceId')) {
        return Response.json({ code: 20004, message: 'namespace not found', data: null });
      }

      return Response.json({
        code: 0,
        message: 'success',
        data: {
          content: 'hello-public',
          md5: 'abc123',
          lastModified: 1,
          contentType: 'text/plain',
        },
      });
    });

    const { config } = createClients(mock.port);
    const result = await config.getConfig({ dataId: 'app.yaml', groupName: 'DEFAULT_GROUP' });

    expect(result.content).toBe('hello-public');
    expect(new URL(mock.getLastUrl()!).searchParams.get('namespaceId')).toBe('');
  });

  test('getInstances lists instances when namespaceId is omitted (public namespace)', async () => {
    const mock = startMockServer((req) => {
      const url = new URL(req.url);
      if (!url.searchParams.has('namespaceId')) {
        return Response.json({ code: 20004, message: 'namespace not found', data: null });
      }

      return Response.json({
        code: 0,
        message: 'success',
        data: {
          serviceName: 'demo',
          instances: [{ serviceName: 'demo', ip: '127.0.0.1', port: 8080 }],
        },
      });
    });

    const { service } = createClients(mock.port);
    const instances = await service.getInstances({ serviceName: 'demo' });

    expect(instances).toHaveLength(1);
    expect(instances[0]?.ip).toBe('127.0.0.1');
    expect(new URL(mock.getLastUrl()!).searchParams.get('namespaceId')).toBe('');
  });

  test('registerInstance sends empty namespaceId in body for public namespace', async () => {
    const mock = startMockServer((req) => {
      return new Response('ok', { status: 200 });
    });

    const { service } = createClients(mock.port);
    await service.registerInstance({ serviceName: 'demo', ip: '127.0.0.1', port: 8080 });

    const body = new URLSearchParams(mock.getLastBody()!);
    expect(body.get('namespaceId')).toBe('');
  });

  test('deregisterInstance includes empty namespaceId for public namespace', async () => {
    const mock = startMockServer((req) => {
      const url = new URL(req.url);
      if (!url.searchParams.has('namespaceId')) {
        return new Response('namespace not found', { status: 400 });
      }

      return new Response('ok', { status: 200 });
    });

    const { service } = createClients(mock.port);
    await service.deregisterInstance('demo', '127.0.0.1', 8080);

    expect(new URL(mock.getLastUrl()!).searchParams.get('namespaceId')).toBe('');
  });
});
