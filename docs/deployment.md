# Production Deployment Guide

This guide covers best practices for deploying Bun Server Framework applications
to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Configuration](#configuration)
- [Process Management](#process-management)
- [Reverse Proxy](#reverse-proxy)
- [Monitoring](#monitoring)
- [Security](#security)
- [Scaling](#scaling)

## Prerequisites

- Bun runtime (latest stable version)
- Node.js 18+ (for compatibility)
- Production-ready database (PostgreSQL, MySQL, etc.)
- Reverse proxy (Nginx, Caddy, etc.)

## Environment Setup

### Install Bun

```bash
# On Linux/macOS
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

### Set Environment Variables

Create a `.env.production` file:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
LOG_LEVEL=info
```

Load environment variables in your application:

```typescript
import { ConfigModule } from "@dangao/bun-server";

ConfigModule.forRoot({
  load: (env) => ({
    port: Number(env.PORT) || 3000,
    database: {
      url: env.DATABASE_URL,
    },
    jwt: {
      secret: env.JWT_SECRET,
    },
  }),
});
```

## Configuration

### Production Configuration

```typescript
import { Application } from "@dangao/bun-server";
import { ConfigModule } from "@dangao/bun-server";
import { LoggerModule, LogLevel } from "@dangao/bun-server";

ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: "MyApp",
      port: Number(process.env.PORT) || 3000,
    },
  },
});

LoggerModule.forRoot({
  logger: {
    level: LogLevel.INFO, // Use INFO in production
    prefix: "App",
  },
  enableRequestLogging: true,
});

const app = new Application({
  port: Number(process.env.PORT) || 3000,
});

// Register modules and start
await app.listen();
```

### Error Handling

Ensure proper error handling in production:

```typescript
// Global error handler is enabled by default
// Customize error responses if needed
app.use(async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    // Log error
    console.error("Request error:", error);

    // Return appropriate error response
    if (error instanceof HttpException) {
      return ctx.createResponse(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    // Generic error
    return ctx.createResponse(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});
```

## Process Management

### Using PM2

Install PM2:

```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: "bun-server-app",
    script: "bun",
    args: "run src/index.ts",
    instances: "max", // Use all CPU cores
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true,
  }],
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enable auto-start on system reboot
```

### Using systemd

Create `/etc/systemd/system/bun-server.service`:

```ini
[Unit]
Description=Bun Server Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/bun-server
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable bun-server
sudo systemctl start bun-server
sudo systemctl status bun-server
```

## Reverse Proxy

### Nginx Configuration

```nginx
upstream bun_server {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://bun_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy Configuration

Create `Caddyfile`:

```
example.com {
    reverse_proxy localhost:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

## Monitoring

### Health Checks

Use the built-in HealthModule:

```typescript
import { HealthModule } from "@dangao/bun-server";

HealthModule.forRoot({
  indicators: [
    {
      name: "database",
      check: async () => {
        // Check database connection
        await db.query("SELECT 1");
        return { status: "up" };
      },
    },
  ],
});

// Health endpoints:
// GET /health - Overall health
// GET /ready - Readiness check
```

### Logging

Configure structured logging:

```typescript
LoggerModule.forRoot({
  logger: {
    level: LogLevel.INFO,
    format: "json", // Use JSON in production
  },
  enableRequestLogging: true,
});
```

### Metrics

Use MetricsModule for application metrics:

```typescript
import { MetricsModule } from "@dangao/bun-server";

MetricsModule.forRoot({
  enableDefaultMetrics: true,
  enableHttpMetrics: true,
});

// Metrics endpoint: GET /metrics
```

## Security

### HTTPS

Always use HTTPS in production. Configure SSL/TLS certificates (Let's Encrypt,
etc.).

### Security Headers

Add security middleware:

```typescript
app.use(async (ctx, next) => {
  const response = await next();
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
});
```

### Rate Limiting

Enable rate limiting:

```typescript
import { createRateLimitMiddleware } from "@dangao/bun-server";

app.use(createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
}));
```

### Input Validation

Always validate input:

```typescript
import { Validate, IsString, IsEmail } from '@dangao/bun-server';

class CreateUserDto {
  @IsString()
  public name!: string;

  @IsEmail()
  public email!: string;
}

@POST('/users')
public createUser(@Body() @Validate() user: CreateUserDto) {
  // User is validated
}
```

## Scaling

### Horizontal Scaling

Run multiple instances behind a load balancer:

```bash
# Start multiple instances
PORT=3000 bun run src/index.ts &
PORT=3001 bun run src/index.ts &
PORT=3002 bun run src/index.ts &
```

Configure load balancer (Nginx, HAProxy, etc.) to distribute traffic.

### Database Connection Pooling

Configure connection pooling:

```typescript
DatabaseModule.forRoot({
  database: {
    type: "postgres",
    config: {
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum pool size
      min: 5, // Minimum pool size
    },
  },
});
```

### Caching

Use CacheModule for frequently accessed data:

```typescript
CacheModule.forRoot({
  store: new RedisCacheStore(redisClient),
  defaultTtl: 3600000, // 1 hour
});
```

### Session Storage

Use Redis for distributed session storage:

```typescript
SessionModule.forRoot({
  store: new RedisSessionStore(redisClient),
  maxAge: 86400000, // 24 hours
});
```

## Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Error handling configured
- [ ] Logging configured
- [ ] Health checks enabled
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] Database connection pooling configured
- [ ] Process manager configured (PM2/systemd)
- [ ] Reverse proxy configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
