/**
 * 任务数据
 */
export interface JobData {
  [key: string]: unknown;
}

/**
 * 任务选项
 */
export interface JobOptions {
  /**
   * 任务延迟（毫秒）
   */
  delay?: number;

  /**
   * 任务优先级（数字越大优先级越高）
   */
  priority?: number;

  /**
   * 任务重试次数
   */
  attempts?: number;

  /**
   * 任务重试次数别名，兼容早期 API。
   */
  retries?: number;

  /**
   * 任务重试延迟（毫秒）
   */
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };

  /**
   * 任务超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 任务 ID（如果不提供则自动生成）
   */
  jobId?: string;

  /**
   * 是否移除任务（如果已完成）
   */
  removeOnComplete?: boolean | number;

  /**
   * 是否移除任务（如果失败）
   */
  removeOnFail?: boolean | number;
}

/**
 * 任务
 */
export interface Job<T = JobData> {
  /**
   * 任务 ID
   */
  id: string;

  /**
   * 任务名称
   */
  name: string;

  /**
   * 任务数据
   */
  data: T;

  /**
   * 任务选项
   */
  options?: JobOptions;

  /**
   * 任务状态
   */
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

  /**
   * 创建时间
   */
  createdAt: number;

  /**
   * 更新时间
   */
  updatedAt?: number;

  /**
   * 完成结果
   */
  result?: unknown;

  /**
   * 完成时间
   */
  completedAt?: number;

  /**
   * 失败错误信息
   */
  error?: string;
}

/**
 * 任务处理器
 */
export type JobHandler<T = JobData> = (job: Job<T>) => Promise<void> | void;

/**
 * 队列存储接口
 */
export interface QueueStore {
  /**
   * 添加任务
   * @param queueName - 队列名称
   * @param job - 任务
   * @returns 任务 ID
   */
  add<T = JobData>(
    queueName: string,
    job: Omit<Job<T>, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  ): Promise<string>;

  /**
   * 获取任务
   * @param queueName - 队列名称
   * @param jobId - 任务 ID
   * @returns 任务，如果不存在则返回 undefined
   */
  get<T = JobData>(queueName: string, jobId: string): Promise<Job<T> | undefined>;

  /**
   * 获取下一个待处理的任务
   * @param queueName - 队列名称
   * @returns 任务，如果没有则返回 undefined
   */
  getNext<T = JobData>(queueName: string): Promise<Job<T> | undefined>;

  /**
   * 更新任务状态
   * @param queueName - 队列名称
   * @param jobId - 任务 ID
   * @param status - 新状态
   * @returns 是否更新成功
   */
  updateStatus(
    queueName: string,
    jobId: string,
    status: Job['status'],
  ): Promise<boolean>;

  complete?(
    queueName: string,
    jobId: string,
    result?: unknown,
  ): Promise<boolean>;

  fail?(
    queueName: string,
    jobId: string,
    error: Error,
  ): Promise<boolean>;

  getStats?(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }>;

  /**
   * 删除任务
   * @param queueName - 队列名称
   * @param jobId - 任务 ID
   * @returns 是否删除成功
   */
  delete(queueName: string, jobId: string): Promise<boolean>;

  /**
   * 清空队列
   * @param queueName - 队列名称
   * @returns 是否清空成功
   */
  clear(queueName: string): Promise<boolean>;

  /**
   * 获取队列中的任务数量
   * @param queueName - 队列名称
   * @returns 任务数量
   */
  count(queueName: string): Promise<number>;
}

/**
 * 内存队列存储实现
 */
export class MemoryQueueStore implements QueueStore {
  private queues: Map<string, Map<string, Job>> = new Map();
  private jobCounter = 0;

  public async add<T = JobData>(
    queueName: string,
    job: Omit<Job<T>, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const queue = this.getQueue(queueName);
    const jobId = job.options?.jobId ?? `job_${++this.jobCounter}_${Date.now()}`;
    const now = Date.now();

    const fullJob: Job<T> = {
      id: jobId,
      name: job.name,
      data: job.data,
      options: job.options,
      status: job.options?.delay ? 'delayed' : 'waiting',
      createdAt: now,
      updatedAt: now,
    };

    queue.set(jobId, fullJob as Job<JobData>);
    return jobId;
  }

  public async get<T = JobData>(
    queueName: string,
    jobId: string,
  ): Promise<Job<T> | undefined> {
    const queue = this.getQueue(queueName);
    return queue.get(jobId) as Job<T> | undefined;
  }

  public async getNext<T = JobData>(
    queueName: string,
  ): Promise<Job<T> | undefined> {
    const queue = this.getQueue(queueName);
    const now = Date.now();

    // 查找下一个待处理的任务（优先处理 delayed 且已到期的任务，然后处理 waiting 的任务）
    let nextJob: Job<T> | undefined;
    let highestPriority = -Infinity;

    for (const job of queue.values()) {
      // 检查 delayed 任务是否到期
      if (job.status === 'delayed' && job.options?.delay) {
        const delayEndTime = job.createdAt + job.options.delay;
        if (now >= delayEndTime) {
          if (
            (job.options.priority ?? 0) > highestPriority ||
            !nextJob
          ) {
            nextJob = job as Job<T>;
            highestPriority = job.options?.priority ?? 0;
          }
        }
      } else if (job.status === 'waiting') {
        if (
          (job.options?.priority ?? 0) > highestPriority ||
          !nextJob
        ) {
          nextJob = job as Job<T>;
          highestPriority = job.options?.priority ?? 0;
        }
      }
    }

    return nextJob;
  }

  public async updateStatus(
    queueName: string,
    jobId: string,
    status: Job['status'],
  ): Promise<boolean> {
    const queue = this.getQueue(queueName);
    const job = queue.get(jobId);
    if (!job) {
      return false;
    }

    job.status = status;
    job.updatedAt = Date.now();
    return true;
  }

  public async delete(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.getQueue(queueName);
    return queue.delete(jobId);
  }

  public async clear(queueName: string): Promise<boolean> {
    const queue = this.getQueue(queueName);
    queue.clear();
    return true;
  }

  public async count(queueName: string): Promise<number> {
    const queue = this.getQueue(queueName);
    return queue.size;
  }

  private getQueue(queueName: string): Map<string, Job<JobData>> {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, new Map());
    }
    return this.queues.get(queueName)!;
  }
}

/**
 * Cron 表达式配置
 */
export interface CronOptions {
  /**
   * Cron 表达式（支持标准 5 字段格式：分 时 日 月 周）
   * 例如：'0 0 * * *' 表示每天午夜执行
   */
  pattern: string;

  /**
   * 时区
   * @default 'UTC'
   */
  timezone?: string;

  /**
   * 是否立即执行一次
   * @default false
   */
  runOnInit?: boolean;
}

/**
 * QueueModule 配置选项
 */
export interface QueueModuleOptions {
  /**
   * 队列存储实现
   * @default MemoryQueueStore
   */
  store?: QueueStore;

  /**
   * 默认队列名称
   * @default 'default'
   */
  defaultQueue?: string;

  /**
   * 是否启用工作进程
   * @default true
   */
  enableWorker?: boolean;

  /**
   * 工作进程并发数
   * @default 1
   */
  concurrency?: number;
}

/**
 * QueueService Token
 */
export const QUEUE_SERVICE_TOKEN = Symbol('@dangao/bun-server:queue:service');

/**
 * QueueModule Options Token
 */
export const QUEUE_OPTIONS_TOKEN = Symbol('@dangao/bun-server:queue:options');
