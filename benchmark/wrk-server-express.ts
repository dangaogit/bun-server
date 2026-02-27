import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const LARGE_JSON = {
  users: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i % 3 === 0 ? 'admin' : 'user',
    active: i % 5 !== 0,
  })),
  total: 20,
  page: 1,
  pageSize: 20,
};

const noop: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

const timestamp: RequestHandler = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Timestamp', Date.now().toString());
  next();
};

const app = express();
app.use(express.json());

app.get('/api/ping', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/json', (_req: Request, res: Response) => {
  res.json(LARGE_JSON);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  res.json({ id: req.params.id, name: `User ${req.params.id}` });
});

app.post('/api/users', (req: Request, res: Response) => {
  res.json({ ok: true, name: req.body.name });
});

app.post('/api/users/validated', (req: Request, res: Response) => {
  const { name, email } = req.body;
  if (typeof name !== 'string' || name.length < 2) {
    res.status(400).json({ error: 'name must be at least 2 characters' });
    return;
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'invalid email' });
    return;
  }
  res.json({ ok: true, name, email });
});

app.get('/api/search', (req: Request, res: Response) => {
  const q = req.query.q as string;
  res.json({ query: q, results: [`result:${q}`] });
});

app.get('/api/headers', (req: Request, res: Response) => {
  res.json({ ua: req.headers['user-agent'] });
});

app.get('/api/middleware', noop, noop, timestamp, (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/io', async (_req: Request, res: Response) => {
  const buf = await readFile(import.meta.path);
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16);
  res.json({ size: buf.byteLength, hash });
});

const port = Number(process.env.PORT ?? 3301);
const server = app.listen(port, () => {
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : port;
  console.log(`WRK_READY:${actualPort}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
