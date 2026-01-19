import {
  Application,
  Body,
  ConfigModule,
  Controller,
  Cron,
  GET,
  Inject,
  Injectable,
  LoggerModule,
  LogLevel,
  Module,
  POST,
  Queue,
  QUEUE_SERVICE_TOKEN,
  QueueModule,
  QueueService,
} from '@dangao/bun-server';
import type { Job, JobData } from '@dangao/bun-server';

/**
 * 邮件服务 - 演示队列任务的使用
 */
@Injectable()
class EmailService {
  private readonly sentEmails: string[] = [];

  public async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[EmailService] Sending email to ${to}: ${subject}`);
    // 模拟发送邮件延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.sentEmails.push(to);
    console.log(`[EmailService] Email sent to ${to}`);
  }

  public getSentEmails(): string[] {
    return [...this.sentEmails];
  }
}

/**
 * 通知服务 - 演示队列任务处理器
 */
@Injectable()
class NotificationService {
  public constructor(
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(QUEUE_SERVICE_TOKEN) private readonly queue: QueueService,
  ) {
    // 注册队列任务处理器
    // 注意：构造函数中调用异步方法需要特别注意
    // 这里使用 void 运算符忽略 Promise，因为构造函数不能是 async
    // 实际应用中，建议在应用启动后显式调用 initialize() 方法
    void this.registerHandlers();
  }

  /**
   * 初始化队列处理器（推荐在应用启动后显式调用）
   */
  public async initialize(): Promise<void> {
    await this.registerHandlers();
  }

  private async registerHandlers(): Promise<void> {
    // 注册发送邮件任务处理器
    await this.queue.registerHandler<{ to: string; subject: string; body: string }>(
      'send-email',
      async (job: Job<{ to: string; subject: string; body: string }>) => {
        console.log(`[NotificationService] Processing job ${job.id}: send-email`);
        await this.emailService.sendEmail(job.data.to, job.data.subject, job.data.body);
      },
    );

    // 注册批量通知任务处理器
    await this.queue.registerHandler<{ users: string[]; message: string }>(
      'batch-notify',
      async (job: Job<{ users: string[]; message: string }>) => {
        console.log(`[NotificationService] Processing job ${job.id}: batch-notify`);
        for (const user of job.data.users) {
          await this.emailService.sendEmail(user, 'Batch Notification', job.data.message);
        }
      },
    );
  }

  /**
   * 添加发送邮件任务到队列
   */
  public async queueEmail(to: string, subject: string, body: string): Promise<string> {
    return await this.queue.add('send-email', { to, subject, body });
  }

  /**
   * 添加批量通知任务到队列
   */
  public async queueBatchNotify(users: string[], message: string): Promise<string> {
    return await this.queue.add('batch-notify', { users, message }, {
      priority: 10, // 高优先级
    });
  }
}

/**
 * 定时任务服务 - 演示 Cron 任务
 */
@Injectable()
class ScheduledTaskService {
  public constructor(
    @Inject(QUEUE_SERVICE_TOKEN) private readonly queue: QueueService,
  ) {
    // 注册 Cron 任务
    // 注意：构造函数中调用异步方法，使用 void 运算符忽略 Promise
    void this.registerCronJobs();
  }

  /**
   * 初始化 Cron 任务（推荐在应用启动后显式调用）
   */
  public async initialize(): Promise<void> {
    await this.registerCronJobs();
  }

  private async registerCronJobs(): Promise<void> {
    // 注册每日报告任务（每天午夜执行）
    await this.queue.registerCron(
      'daily-report',
      async () => {
        console.log('[ScheduledTaskService] Generating daily report...');
        // 生成报告的逻辑
      },
      {
        pattern: '0 0 * * *', // Cron 表达式：分 时 日 月 周，每天午夜 00:00 执行
        runOnInit: false,
      },
    );

    // 注册清理任务（每小时执行一次）
    await this.queue.registerCron(
      'cleanup',
      async () => {
        console.log('[ScheduledTaskService] Running cleanup task...');
        // 清理逻辑
      },
      {
        pattern: '0 * * * *', // Cron 表达式：每小时的 0 分执行
        runOnInit: true, // 启动时立即执行一次
      },
    );
  }
}

@Controller('/api/notifications')
class NotificationController {
  public constructor(
    @Inject(NotificationService) private readonly notificationService: NotificationService,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {}

  @POST('/send')
  public async sendNotification(@Body() body: { to: string; subject: string; body: string }) {
    const jobId = await this.notificationService.queueEmail(
      body.to,
      body.subject,
      body.body,
    );
    return { jobId, message: 'Email queued for sending' };
  }

  @POST('/batch')
  public async sendBatchNotification(
    @Body() body: { users: string[]; message: string },
  ) {
    const jobId = await this.notificationService.queueBatchNotify(
      body.users,
      body.message,
    );
    return { jobId, message: 'Batch notification queued' };
  }

  @GET('/sent')
  public getSentEmails() {
    return { emails: this.emailService.getSentEmails() };
  }
}

@Controller('/api/queue')
class QueueController {
  public constructor(
    @Inject(QUEUE_SERVICE_TOKEN) private readonly queue: QueueService,
  ) {}

  @GET('/stats')
  public async getStats() {
    const defaultQueueCount = await this.queue.count();
    return {
      defaultQueue: {
        count: defaultQueueCount,
      },
    };
  }

  @POST('/clear')
  public async clearQueue() {
    await this.queue.clear();
    return { message: 'Queue cleared' };
  }
}

@Module({
  controllers: [NotificationController, QueueController],
  providers: [EmailService, NotificationService, ScheduledTaskService],
  exports: [EmailService, NotificationService],
})
class AppModule {}

const port = Number(process.env.PORT ?? 3300);

// 配置 ConfigModule
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: 'Queue Example App',
      port,
    },
  },
});

// 配置 Logger 模块
LoggerModule.forRoot({
  logger: {
    prefix: 'QueueExample',
    level: LogLevel.INFO,
  },
  enableRequestLogging: true,
});

// 配置 Queue 模块
QueueModule.forRoot({
  defaultQueue: 'default',
  enableWorker: true, // 启用工作进程
  concurrency: 3, // 并发处理 3 个任务
});

// 应用模块
@Module({
  imports: [ConfigModule, LoggerModule, QueueModule],
  controllers: [NotificationController, QueueController],
  providers: [EmailService, NotificationService, ScheduledTaskService],
})
class RootModule {}

const app = new Application({ port });
app.registerModule(RootModule);
app.listen(port);

console.log(`🚀 Queue Example Server running on http://localhost:${port}`);
console.log(`\n📝 Example endpoints:`);
console.log(`  POST /api/notifications/send  - Queue an email to send`);
console.log(`  POST /api/notifications/batch - Queue a batch notification`);
console.log(`  GET  /api/notifications/sent  - Get list of sent emails`);
console.log(`  GET  /api/queue/stats        - Get queue statistics`);
console.log(`  POST /api/queue/clear        - Clear the queue`);
console.log(`\n⏰ Scheduled tasks:`);
console.log(`  - Daily report: runs at midnight (0 0 * * *)`);
console.log(`  - Cleanup: runs every hour (0 * * * *)`);
