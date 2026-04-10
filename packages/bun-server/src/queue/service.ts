import { Injectable } from '../di/decorators';
import { Inject } from '../di/decorators';
import type {
  QueueStore,
  QueueModuleOptions,
  Job,
  JobData,
  JobHandler,
  JobOptions,
  CronOptions,
} from './types';
import { QUEUE_OPTIONS_TOKEN } from './types';
import { getRuntime } from '../platform/runtime';

/**
 * 队列服务
 */
@Injectable()
export class QueueService {
  private store: QueueStore;
  private defaultQueue: string;
  private enableWorker: boolean;
  private concurrency: number;
  private workers: Map<string, Set<Promise<void>>> = new Map();
  private cronJobs: Map<string, { handler: JobHandler; options: CronOptions }> =
    new Map();
  private cronTimers: Map<string, ReturnType<typeof setInterval> | { stop(): void }> = new Map();

  public constructor(@Inject(QUEUE_OPTIONS_TOKEN) options: QueueModuleOptions) {
    this.store = options.store!;
    this.defaultQueue = options.defaultQueue ?? 'default';
    this.enableWorker = options.enableWorker ?? true;
    this.concurrency = options.concurrency ?? 1;

    if (this.enableWorker) {
      this.startWorker(this.defaultQueue);
    }
  }

  /**
   * 添加任务
   * @param jobName - 任务名称
   * @param data - 任务数据
   * @param options - 任务选项
   * @param queueName - 队列名称（可选，默认使用 defaultQueue）
   * @returns 任务 ID
   */
  public async add<T = JobData>(
    jobName: string,
    data: T,
    options?: JobOptions,
    queueName?: string,
  ): Promise<string> {
    const queue = queueName ?? this.defaultQueue;
    const jobId = await this.store.add(queue, {
      name: jobName,
      data,
      options,
    });

    // 如果启用了工作进程，确保队列有工作进程在运行
    if (this.enableWorker && !this.workers.has(queue)) {
      this.startWorker(queue);
    }

    return jobId;
  }

  /**
   * 获取任务
   * @param jobId - 任务 ID
   * @param queueName - 队列名称（可选）
   * @returns 任务，如果不存在则返回 undefined
   */
  public async get<T = JobData>(
    jobId: string,
    queueName?: string,
  ): Promise<Job<T> | undefined> {
    const queue = queueName ?? this.defaultQueue;
    return this.store.get<T>(queue, jobId);
  }

  /**
   * 删除任务
   * @param jobId - 任务 ID
   * @param queueName - 队列名称（可选）
   * @returns 是否删除成功
   */
  public async delete(jobId: string, queueName?: string): Promise<boolean> {
    const queue = queueName ?? this.defaultQueue;
    return this.store.delete(queue, jobId);
  }

  /**
   * 清空队列
   * @param queueName - 队列名称（可选）
   * @returns 是否清空成功
   */
  public async clear(queueName?: string): Promise<boolean> {
    const queue = queueName ?? this.defaultQueue;
    return this.store.clear(queue);
  }

  /**
   * 获取队列中的任务数量
   * @param queueName - 队列名称（可选）
   * @returns 任务数量
   */
  public async count(queueName?: string): Promise<number> {
    const queue = queueName ?? this.defaultQueue;
    return this.store.count(queue);
  }

  /**
   * 注册任务处理器
   * @param jobName - 任务名称
   * @param handler - 任务处理器
   * @param queueName - 队列名称（可选）
   */
  public async registerHandler<T = JobData>(
    jobName: string,
    handler: JobHandler<T>,
    queueName?: string,
  ): Promise<void> {
    const queue = queueName ?? this.defaultQueue;
    const key = `${queue}:${jobName}`;

    // 存储处理器（实际实现中可能需要更复杂的注册机制）
    // 这里简化处理，假设处理器可以通过任务名称找到
    // 实际使用时，可能需要一个处理器注册表
    (this as unknown as { handlers: Map<string, JobHandler<JobData>> }).handlers =
      (this as unknown as { handlers: Map<string, JobHandler<JobData>> }).handlers ??
      new Map();
    (
      this as unknown as { handlers: Map<string, JobHandler<JobData>> }
    ).handlers.set(key, handler as JobHandler<JobData>);
  }

  /**
   * 注册定时任务（Cron）
   * @param jobName - 任务名称
   * @param handler - 任务处理器
   * @param options - Cron 配置
   * @param queueName - 队列名称（可选）
   */
  public async registerCron<T = JobData>(
    jobName: string,
    handler: JobHandler<T>,
    options: CronOptions,
    queueName?: string,
  ): Promise<void> {
    const queue = queueName ?? this.defaultQueue;
    const key = `${queue}:${jobName}`;

    this.cronJobs.set(key, { handler: handler as JobHandler<JobData>, options });

    // 如果设置了立即执行，先执行一次
    if (options.runOnInit) {
      await this.add(jobName, {} as T, undefined, queue);
    }

    if (getRuntime().engine === 'bun') {
      // Bun 平台：使用原生 Bun.cron() —— 支持完整 cron 表达式、无重叠、--hot 安全、UTC 调度
      const job = (Bun as any).cron(options.pattern, async () => {
        await this.add(jobName, {} as T, undefined, queue);
      });
      this.cronTimers.set(key, job);
    } else {
      // Node.js 平台兜底：简化实现，仅支持基础 cron 格式
      const interval = this.parseCronInterval(options.pattern);
      if (interval > 0) {
        const timer = setInterval(async () => {
          await this.add(jobName, {} as T, undefined, queue);
        }, interval);
        this.cronTimers.set(key, timer);
      }
    }
  }

  /**
   * 启动工作进程
   * @param queueName - 队列名称
   */
  private startWorker(queueName: string): void {
    if (this.workers.has(queueName)) {
      return;
    }

    const workerSet = new Set<Promise<void>>();
    this.workers.set(queueName, workerSet);

    // 启动并发工作进程
    for (let i = 0; i < this.concurrency; i++) {
      const worker = this.processQueue(queueName);
      workerSet.add(worker);
    }
  }

  /**
   * 处理队列
   * @param queueName - 队列名称
   */
  private async processQueue(queueName: string): Promise<void> {
    while (true) {
      try {
        const job = await this.store.getNext(queueName);
        if (!job) {
          // 没有任务，等待一段时间后重试
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        // 更新任务状态为 active
        await this.store.updateStatus(queueName, job.id, 'active');

        try {
          // 获取处理器
          const handler = this.getHandler(job.name, queueName);
          if (handler) {
            await handler(job as Job<JobData>);
            await this.store.updateStatus(queueName, job.id, 'completed');
          } else {
            // 没有找到处理器，标记为失败
            await this.store.updateStatus(queueName, job.id, 'failed');
          }
        } catch (error) {
          // 处理任务失败
          await this.store.updateStatus(queueName, job.id, 'failed');
          // 可以在这里添加重试逻辑
          console.error(`Job ${job.id} failed:`, error);
        }
      } catch (error) {
        console.error(`Error processing queue ${queueName}:`, error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * 获取处理器
   * @param jobName - 任务名称
   * @param queueName - 队列名称
   * @returns 处理器，如果不存在则返回 undefined
   */
  private getHandler(
    jobName: string,
    queueName: string,
  ): JobHandler<JobData> | undefined {
    const key = `${queueName}:${jobName}`;
    return (
      this as unknown as { handlers: Map<string, JobHandler<JobData>> }
    ).handlers?.get(key);
  }

  /**
   * 解析 Cron 表达式为间隔时间（毫秒）
   * 注意：这是简化实现，实际应该使用专业的 cron 解析库
   * @param pattern - Cron 表达式
   * @returns 间隔时间（毫秒），如果无法解析则返回 -1
   */
  private parseCronInterval(pattern: string): number {
    // 简化实现：只支持简单的格式
    // 实际应该使用 cron-parser 等库
    const parts = pattern.trim().split(/\s+/);
    if (parts.length !== 5) {
      return -1;
    }

    const [minute, hour, day, month, weekday] = parts;

    // 如果所有字段都是 *，表示每分钟执行
    if (
      minute === '*' &&
      hour === '*' &&
      day === '*' &&
      month === '*' &&
      weekday === '*'
    ) {
      return 60000; // 1 分钟
    }

    // 如果分钟是数字，其他都是 *，表示每 N 分钟执行
    if (
      /^\d+$/.test(minute) &&
      hour === '*' &&
      day === '*' &&
      month === '*' &&
      weekday === '*'
    ) {
      return parseInt(minute, 10) * 60000;
    }

    // 默认返回 -1，表示需要更复杂的解析
    // 实际实现中应该使用 cron-parser
    return -1;
  }

  /**
   * 销毁服务，清理资源
   */
  public destroy(): void {
    for (const handle of this.cronTimers.values()) {
      if (handle && typeof handle === 'object' && 'stop' in handle) {
        (handle as { stop(): void }).stop();
      } else {
        clearInterval(handle as ReturnType<typeof setInterval>);
      }
    }
    this.cronTimers.clear();
    this.cronJobs.clear();
    this.workers.clear();
  }
}
