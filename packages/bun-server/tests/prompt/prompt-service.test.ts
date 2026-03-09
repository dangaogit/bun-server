import { describe, expect, test } from 'bun:test';
import { PromptService } from '../../src/prompt/service';
import { InMemoryPromptStore } from '../../src/prompt/stores/memory-store';

function createService(): PromptService {
  return new PromptService({ store: new InMemoryPromptStore() } as never);
}

describe('PromptService', () => {
  test('should create and retrieve a template', async () => {
    const service = createService();
    const created = await service.create({ name: 'greeting', content: 'Hello, {{name}}!' });

    expect(created.id).toBeDefined();
    expect(created.version).toBe(1);
    expect(created.variables).toContain('name');

    const fetched = await service.get(created.id);
    expect(fetched.content).toBe('Hello, {{name}}!');
  });

  test('should render template with variables', async () => {
    const service = createService();
    const template = await service.create({ name: 't', content: 'Hi {{name}}, welcome to {{app}}!' });
    const rendered = await service.render(template.id, { name: 'Alice', app: 'MyApp' });
    expect(rendered).toBe('Hi Alice, welcome to MyApp!');
  });

  test('should leave unresolved variables as-is', async () => {
    const service = createService();
    const template = await service.create({ name: 't', content: 'Hello {{name}}, from {{sender}}!' });
    const rendered = await service.render(template.id, { name: 'Bob' });
    expect(rendered).toBe('Hello Bob, from {{sender}}!');
  });

  test('should increment version on update', async () => {
    const service = createService();
    const template = await service.create({ name: 't', content: 'v1 {{x}}' });
    const updated = await service.update(template.id, { content: 'v2 {{x}} {{y}}' });
    expect(updated.version).toBe(2);
    expect(updated.variables).toContain('y');
  });

  test('should retrieve specific version', async () => {
    const service = createService();
    const template = await service.create({ name: 't', content: 'v1' });
    await service.update(template.id, { content: 'v2' });

    const v1 = await service.getVersion(template.id, 1);
    expect(v1.content).toBe('v1');
    const v2 = await service.getVersion(template.id, 2);
    expect(v2.content).toBe('v2');
  });

  test('should list all templates', async () => {
    const service = createService();
    await service.create({ name: 'a', content: 'A' });
    await service.create({ name: 'b', content: 'B' });
    const list = await service.list();
    expect(list).toHaveLength(2);
  });

  test('should delete template', async () => {
    const service = createService();
    const template = await service.create({ name: 'd', content: 'delete me' });
    await service.delete(template.id);
    expect(service.get(template.id)).rejects.toThrow();
  });

  test('should throw 404 for missing template', async () => {
    const service = createService();
    expect(service.get('non-existent')).rejects.toThrow('not found');
  });
});
