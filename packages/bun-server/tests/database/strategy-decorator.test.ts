import { describe, expect, test } from 'bun:test';

import {
  DbStrategy,
  Session as DbSession,
  getDbStrategy,
} from '../../src/database/strategy-decorator';

describe('DbStrategy decorator', () => {
  test('should read class level strategy', () => {
    @DbStrategy('session')
    class UserController {
      public list(): void {}
    }

    expect(getDbStrategy(UserController as any, 'list')).toBe('session');
  });

  test('should prefer method level strategy', () => {
    @DbStrategy('pool')
    class UserController {
      @DbSession()
      public list(): void {}
    }

    expect(getDbStrategy(UserController as any, 'list')).toBe('session');
  });
});

