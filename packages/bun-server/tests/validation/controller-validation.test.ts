import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET } from '../../src/router/decorators';
import { Query } from '../../src/controller/decorators';
import { Validate, IsEmail, IsString, MinLength } from '../../src/validation';
import { RouteRegistry } from '../../src/router/registry';
import { Context } from '../../src/core/context';

describe('Controller Validation Integration', () => {
  beforeEach(() => {
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
  });

  afterEach(() => {
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
  });

  test('should accept valid input', async () => {
    @Controller('/api/validation')
    class ValidationController {
      @GET('/email')
      public getUser(@Query('email') @Validate(IsEmail()) email: string) {
        return { email };
      }
    }

    ControllerRegistry.getInstance().register(ValidationController);

    const router = RouteRegistry.getInstance().getRouter();
    const context = new Context(
      new Request('http://localhost/api/validation/email?email=test@example.com'),
    );
    const response = await router.handle(context);
    expect(response?.status).toBe(200);
    const data = await response?.json();
    expect(data).toEqual({ email: 'test@example.com' });
  });

  test('should reject invalid input with 400', async () => {
    @Controller('/api/validation')
    class ValidationController {
      @GET('/name')
      public getUser(@Query('name') @Validate(IsString(), MinLength(1)) name: string) {
        return { name };
      }
    }

    ControllerRegistry.getInstance().register(ValidationController);

    const router = RouteRegistry.getInstance().getRouter();
    const context = new Context(new Request('http://localhost/api/validation/name?name='));
    const response = await router.handle(context);
    expect(response?.status).toBe(400);
    const data = await response?.json();
    expect(data.error).toBe('Validation failed');
    expect(data.issues.length).toBeGreaterThan(0);
  });
});


