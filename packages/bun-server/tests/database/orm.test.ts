import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import {
  Entity,
  Column,
  PrimaryKey,
  Repository,
  BaseRepository,
  getEntityMetadata,
  getColumnMetadata,
  getRepositoryMetadata,
} from '../../src/database/orm';
import { DatabaseService, DATABASE_SERVICE_TOKEN } from '../../src/database';
import { Container } from '../../src/di/container';

// 测试实体
@Entity('test_users')
class TestUser {
  @PrimaryKey()
  @Column({ type: 'INTEGER', autoIncrement: true })
  public id!: number;

  @Column({ type: 'TEXT', nullable: false })
  public name!: string;

  @Column({ type: 'TEXT', nullable: true })
  public email?: string;
}

// 测试 Repository
@Repository('test_users', 'id')
class TestUserRepository extends BaseRepository<TestUser> {
  protected tableName = 'test_users';
  protected primaryKey = 'id';
}

describe('ORM Decorators', () => {
  test('should define entity metadata', () => {
    const metadata = getEntityMetadata(TestUser);
    expect(metadata).toBeDefined();
    expect(metadata?.tableName).toBe('test_users');
  });

  test('should define column metadata', () => {
    const columns = getColumnMetadata(TestUser);
    expect(columns).toBeDefined();
    expect(columns.length).toBeGreaterThan(0);

    const idColumn = columns.find((col) => col.propertyKey === 'id');
    expect(idColumn).toBeDefined();
    expect(idColumn?.primaryKey).toBe(true);
    expect(idColumn?.autoIncrement).toBe(true);

    const nameColumn = columns.find((col) => col.propertyKey === 'name');
    expect(nameColumn).toBeDefined();
    expect(nameColumn?.name).toBe('name');
    expect(nameColumn?.type).toBe('TEXT');
    // Column 装饰器中 nullable 选项会正确设置
    expect(nameColumn?.nullable).toBe(false);
  });

  test('should define repository metadata', () => {
    const metadata = getRepositoryMetadata(TestUserRepository);
    expect(metadata).toBeDefined();
    expect(metadata?.tableName).toBe('test_users');
    expect(metadata?.primaryKey).toBe('id');
  });
});

describe('BaseRepository', () => {
  let container: Container;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    container = new Container();
    databaseService = new DatabaseService({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
    });
    await databaseService.initialize();

    container.registerInstance(DATABASE_SERVICE_TOKEN, databaseService);
    container.register(TestUserRepository);

    // 创建测试表
    databaseService.query(`
      CREATE TABLE IF NOT EXISTS test_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT
      )
    `);
  });

  afterEach(async () => {
    await databaseService.closePool();
  });

  test('should create repository instance', () => {
    const repository = container.resolve<TestUserRepository>(TestUserRepository);
    expect(repository).toBeInstanceOf(BaseRepository);
    expect(repository).toBeInstanceOf(TestUserRepository);
  });

  test('should find all records', async () => {
    const repository = container.resolve<TestUserRepository>(TestUserRepository);

    // 插入测试数据
    await repository.create({ name: 'Alice', email: 'alice@example.com' });
    await repository.create({ name: 'Bob', email: 'bob@example.com' });

    const users = await repository.findAll();
    expect(users.length).toBe(2);
    expect(users[0].name).toBe('Alice');
    expect(users[1].name).toBe('Bob');
  });

  test('should find by id', async () => {
    const repository = container.resolve<TestUserRepository>(TestUserRepository);

    const created = await repository.create({ name: 'Alice', email: 'alice@example.com' });
    expect(created.id).toBeDefined();

    const found = await repository.findById(created.id!);
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Alice');
    expect(found?.email).toBe('alice@example.com');
  });

  test('should create record', async () => {
    const repository = container.resolve<TestUserRepository>(TestUserRepository);

    const user = await repository.create({ name: 'Alice', email: 'alice@example.com' });
    expect(user.id).toBeDefined();
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
  });

  test('should update record', async () => {
    const repository = container.resolve<TestUserRepository>(TestUserRepository);

    const created = await repository.create({ name: 'Alice', email: 'alice@example.com' });
    const updated = await repository.update(created.id!, { name: 'Alice Updated' });

    expect(updated.name).toBe('Alice Updated');
    expect(updated.email).toBe('alice@example.com');
  });

  test('should delete record', async () => {
    const repository = container.resolve<TestUserRepository>(TestUserRepository);

    const created = await repository.create({ name: 'Alice', email: 'alice@example.com' });
    const deleted = await repository.delete(created.id!);

    expect(deleted).toBe(true);

    const found = await repository.findById(created.id!);
    expect(found).toBeNull();
  });
});
