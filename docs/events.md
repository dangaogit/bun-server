# Event System

The Event Module provides a powerful event-driven architecture for building loosely coupled, highly maintainable applications. It supports synchronous and asynchronous event handling, event priorities, and wildcard event patterns.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Event Module Configuration](#event-module-configuration)
- [Publishing Events](#publishing-events)
- [Listening to Events](#listening-to-events)
- [Event Priority](#event-priority)
- [Async Event Handling](#async-event-handling)
- [Wildcard Events](#wildcard-events)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

## Installation

The Event Module is included in `@dangao/bun-server`. No additional installation is required.

## Quick Start

```typescript
import {
  Application,
  Module,
  Injectable,
  Inject,
  EventModule,
  OnEvent,
  EVENT_EMITTER_TOKEN,
} from '@dangao/bun-server';
import type { EventEmitter } from '@dangao/bun-server';

// Define event
const USER_CREATED = Symbol('user.created');

interface UserCreatedEvent {
  userId: string;
  email: string;
}

// Service that publishes events
@Injectable()
class UserService {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private eventEmitter: EventEmitter,
  ) {}

  async createUser(email: string) {
    const userId = 'user-123';
    
    // Publish event
    this.eventEmitter.emit<UserCreatedEvent>(USER_CREATED, {
      userId,
      email,
    });
    
    return { userId, email };
  }
}

// Service that listens to events
@Injectable()
class NotificationService {
  @OnEvent(USER_CREATED)
  handleUserCreated(payload: UserCreatedEvent) {
    console.log(`Welcome email sent to ${payload.email}`);
  }
}

// Configure module
EventModule.forRoot({
  maxListeners: 20,
});

EventModule.registerListeners([NotificationService]);

@Module({
  imports: [EventModule],
  providers: [UserService, NotificationService],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);

// Initialize event listeners after module registration
EventModule.initializeListeners(app.getContainer());

app.listen(3000);
```

## Core Concepts

### Event Names

Events can be identified by:

- **Symbol**: Recommended for type safety and avoiding naming conflicts
- **String**: Useful for dynamic events or wildcard matching

```typescript
// Symbol event (recommended)
const USER_CREATED = Symbol('user.created');

// String event
const orderEvent = 'order.created';
```

### Event Payload

Events can carry any data as payload. It's recommended to define interfaces for type safety:

```typescript
interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}

// Publishing with typed payload
eventEmitter.emit<UserCreatedEvent>(USER_CREATED, {
  userId: '123',
  email: 'user@example.com',
  createdAt: new Date(),
});
```

## Event Module Configuration

```typescript
EventModule.forRoot({
  // Enable wildcard event matching
  wildcard: true,  // default: false
  
  // Delimiter for wildcard matching
  delimiter: '.',  // default: '.'
  
  // Global prefix for all events
  globalPrefix: 'app',  // optional
  
  // Maximum listeners per event (memory leak warning)
  maxListeners: 10,  // default: 10
  
  // Custom error handler
  onError: (error, event, payload) => {
    console.error(`Error in event ${String(event)}:`, error);
  },
});
```

## Publishing Events

### Synchronous Publishing

Use `emit()` to publish events synchronously. Async listeners will be triggered but not awaited:

```typescript
@Injectable()
class OrderService {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private eventEmitter: EventEmitter,
  ) {}

  createOrder(userId: string, amount: number) {
    const order = { id: 'order-1', userId, amount };
    
    // Publish event (doesn't wait for async listeners)
    this.eventEmitter.emit('order.created', {
      orderId: order.id,
      userId,
      amount,
    });
    
    return order;
  }
}
```

### Asynchronous Publishing

Use `emitAsync()` to wait for all listeners (including async ones) to complete:

```typescript
async createOrder(userId: string, amount: number) {
  const order = { id: 'order-1', userId, amount };
  
  // Wait for all listeners to complete
  await this.eventEmitter.emitAsync('order.created', {
    orderId: order.id,
    userId,
    amount,
  });
  
  return order;
}
```

## Listening to Events

### Using `@OnEvent()` Decorator

The recommended way to listen to events:

```typescript
@Injectable()
class NotificationService {
  @OnEvent('user.created')
  handleUserCreated(payload: { email: string }) {
    console.log(`Sending welcome email to ${payload.email}`);
  }
  
  @OnEvent(USER_DELETED)
  async handleUserDeleted(payload: { userId: string }) {
    await this.cleanupUserData(payload.userId);
  }
}
```

### Manual Subscription

You can also subscribe manually using the EventEmitter:

```typescript
@Injectable()
class DynamicListener {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private eventEmitter: EventEmitter,
  ) {
    // Subscribe
    const unsubscribe = this.eventEmitter.on('custom.event', (payload) => {
      console.log('Received:', payload);
    });
    
    // Later: unsubscribe
    // unsubscribe();
  }
}
```

### One-time Listeners

```typescript
// Using decorator (listener is removed after first call)
// Note: @OnEvent doesn't support once directly, use manual subscription

// Manual one-time subscription
this.eventEmitter.once('setup.complete', (payload) => {
  console.log('Setup completed!');
});
```

## Event Priority

Higher priority listeners execute first:

```typescript
@Injectable()
class HighPriorityService {
  @OnEvent('order.created', { priority: 100 })
  validateOrder(payload: OrderCreatedEvent) {
    // Executes first
    console.log('Validating order...');
  }
}

@Injectable()
class LowPriorityService {
  @OnEvent('order.created', { priority: 1 })
  logOrder(payload: OrderCreatedEvent) {
    // Executes last
    console.log('Logging order...');
  }
}
```

Default priority is `0`. Listeners with the same priority execute in registration order.

## Async Event Handling

Mark listeners as async to ensure proper error handling:

```typescript
@Injectable()
class EmailService {
  @OnEvent('user.created', { async: true })
  async sendWelcomeEmail(payload: { email: string }) {
    await this.mailer.send({
      to: payload.email,
      subject: 'Welcome!',
      body: '...',
    });
  }
}
```

When using `emit()`:
- Async listeners are triggered but not awaited
- Errors are caught and passed to the error handler

When using `emitAsync()`:
- All listeners (sync and async) are awaited
- All errors are caught and handled

## Wildcard Events

Enable wildcard matching in the module configuration:

```typescript
EventModule.forRoot({
  wildcard: true,
});
```

### Single Wildcard (`*`)

Matches exactly one segment:

```typescript
@OnEvent('user.*')
handleAnyUserEvent(payload: unknown) {
  // Matches: user.created, user.updated, user.deleted
  // Does NOT match: user.profile.updated
}
```

### Double Wildcard (`**`)

Matches any number of segments:

```typescript
@OnEvent('order.**')
handleAllOrderEvents(payload: unknown) {
  // Matches: order.created, order.item.added, order.payment.completed
}
```

## Error Handling

### Global Error Handler

```typescript
EventModule.forRoot({
  onError: (error, event, payload) => {
    // Log to monitoring service
    console.error(`Event handler error for ${String(event)}:`, error);
    
    // Optionally re-throw or handle
  },
});
```

### Try-Catch in Listeners

```typescript
@OnEvent('risky.event', { async: true })
async handleRiskyEvent(payload: unknown) {
  try {
    await this.riskyOperation(payload);
  } catch (error) {
    // Handle or log error
    console.error('Failed to process event:', error);
    // Optionally re-throw to trigger global error handler
    throw error;
  }
}
```

## Best Practices

### 1. Use Symbols for Event Names

```typescript
// Good: Type-safe, no naming conflicts
export const USER_CREATED = Symbol('user.created');

// Avoid: Can conflict with other events
const eventName = 'user.created';
```

### 2. Define Event Payload Interfaces

```typescript
// Good: Clear contract
export interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}

// Avoid: Unclear payload structure
eventEmitter.emit(USER_CREATED, { userId, email, date: new Date() });
```

### 3. Keep Listeners Focused

```typescript
// Good: Single responsibility
@OnEvent(USER_CREATED)
sendWelcomeEmail(payload: UserCreatedEvent) { ... }

@OnEvent(USER_CREATED)
trackUserSignup(payload: UserCreatedEvent) { ... }

// Avoid: Too many responsibilities
@OnEvent(USER_CREATED)
handleUserCreated(payload: UserCreatedEvent) {
  this.sendEmail();
  this.trackAnalytics();
  this.notifyAdmin();
  this.createDefaultSettings();
}
```

### 4. Handle Errors Gracefully

```typescript
// Good: Errors don't break other listeners
@OnEvent('payment.failed', { async: true })
async handlePaymentFailure(payload: PaymentFailedEvent) {
  try {
    await this.notifyUser(payload.userId);
  } catch (error) {
    this.logger.error('Failed to notify user', error);
    // Don't re-throw unless necessary
  }
}
```

### 5. Use Priority Wisely

```typescript
// Good: Validation before processing
@OnEvent('order.submitted', { priority: 100 })
validateOrder(payload: OrderEvent) { ... }

@OnEvent('order.submitted', { priority: 50 })
processOrder(payload: OrderEvent) { ... }

@OnEvent('order.submitted', { priority: 1 })
logOrder(payload: OrderEvent) { ... }
```

## API Reference

### EventModule

| Method | Description |
|--------|-------------|
| `forRoot(options?)` | Configure the event module |
| `registerListeners(classes)` | Register listener classes |
| `initializeListeners(container, additional?)` | Initialize and scan listeners |
| `getEventEmitter(container)` | Get the EventEmitter instance |

### EventEmitter

| Method | Description |
|--------|-------------|
| `emit(event, payload)` | Publish event synchronously |
| `emitAsync(event, payload)` | Publish event and wait for all listeners |
| `on(event, listener, options?)` | Subscribe to an event |
| `once(event, listener, options?)` | Subscribe once to an event |
| `off(event, listener)` | Unsubscribe from an event |
| `removeAllListeners(event?)` | Remove all listeners |
| `listenerCount(event)` | Get listener count for an event |
| `eventNames()` | Get all registered event names |

### @OnEvent Decorator

```typescript
@OnEvent(event: string | symbol, options?: {
  async?: boolean;    // default: false
  priority?: number;  // default: 0
})
```

### EventModuleOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `wildcard` | `boolean` | `false` | Enable wildcard matching |
| `delimiter` | `string` | `'.'` | Wildcard delimiter |
| `globalPrefix` | `string` | - | Prefix for all events |
| `maxListeners` | `number` | `10` | Max listeners per event |
| `onError` | `function` | - | Global error handler |

## Related

- [Guide](./guide.md) - Framework guide
- [Request Lifecycle](./request-lifecycle.md) - Understanding the request flow
