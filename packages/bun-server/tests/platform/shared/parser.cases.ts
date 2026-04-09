import type { TestSuite } from './suite';
import type { IParserAdapter } from '../../../src/platform/types';

export function runParserCases(suite: TestSuite, getAdapter: () => IParserAdapter): void {
  const { test, expect } = suite;

  test('parseJSONC parses standard JSON', () => {
    const adapter = getAdapter();
    const result = adapter.parseJSONC('{"a": 1, "b": "hello"}') as Record<string, unknown>;
    expect(result['a']).toBe(1);
    expect(result['b']).toBe('hello');
  });

  test('parseJSONC ignores line comments', () => {
    const adapter = getAdapter();
    const result = adapter.parseJSONC('{\n// comment\n"a": 1}') as Record<string, unknown>;
    expect(result['a']).toBe(1);
  });

  test('parseJSON5 parses JSON5 with trailing commas', () => {
    const adapter = getAdapter();
    const result = adapter.parseJSON5('{a: 1, b: "hello",}') as Record<string, unknown>;
    expect(result['a']).toBe(1);
  });

  test('parseJSONL parses multiple JSON lines', () => {
    const adapter = getAdapter();
    const content = '{"id":1}\n{"id":2}\n{"id":3}';
    const records = adapter.parseJSONL(content);
    expect(records.length).toBe(3);
    expect((records[0] as Record<string, unknown>)['id']).toBe(1);
    expect((records[2] as Record<string, unknown>)['id']).toBe(3);
  });

  test('parseJSONL ignores empty lines', () => {
    const adapter = getAdapter();
    const content = '{"id":1}\n\n{"id":2}\n';
    const records = adapter.parseJSONL(content);
    expect(records.length).toBe(2);
  });

  test('renderMarkdown converts h1 heading', () => {
    const adapter = getAdapter();
    const html = adapter.renderMarkdown('# Hello World');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello World');
  });

  test('renderMarkdown converts bold text', () => {
    const adapter = getAdapter();
    const html = adapter.renderMarkdown('**bold**');
    expect(html).toContain('<strong>');
    expect(html).toContain('bold');
  });
}
