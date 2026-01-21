import { Application, Controller, GET, Inject, Injectable, Module, POST } from '@dangao/bun-server';
import {
  ConfigCenterModule,
  CONFIG_CENTER_TOKEN,
  type ConfigCenter,
} from '@dangao/bun-server';
import {
  ServiceRegistryModule,
  SERVICE_REGISTRY_TOKEN,
  type ServiceRegistry,
  type ServiceInstance,
} from '@dangao/bun-server';
import {
  ServiceClient,
  TraceIdRequestInterceptor,
  RequestLogInterceptor,
  ResponseLogInterceptor,
  CircuitBreakerState,
  Tracer,
  ConsoleTraceCollector,
  ServiceMetricsCollector,
  SpanKind,
  type ServiceCallOptions,
} from '@dangao/bun-server';

/**
 * 微服务示例应用
 *
 * 演示如何使用配置中心、服务注册中心和服务调用客户端
 */
@Injectable()
class MyService {
  private readonly serviceClient: ServiceClient;

  public constructor(
    @Inject(CONFIG_CENTER_TOKEN) private readonly configCenter: ConfigCenter,
    @Inject(SERVICE_REGISTRY_TOKEN) private readonly serviceRegistry: ServiceRegistry,
  ) {
    // 创建服务调用客户端
    this.serviceClient = new ServiceClient(this.serviceRegistry);

    // 添加拦截器
    this.serviceClient.addRequestInterceptor(new TraceIdRequestInterceptor());
    this.serviceClient.addRequestInterceptor(new RequestLogInterceptor());
    this.serviceClient.addResponseInterceptor(new ResponseLogInterceptor());

    // 设置追踪器
    const tracer = new Tracer({
      samplingRate: 1.0,
      enabled: true,
    });
    tracer.addCollector(new ConsoleTraceCollector());
    this.serviceClient.setTracer(tracer);

    // 设置监控指标收集器
    const metricsCollector = new ServiceMetricsCollector({
      enabled: true,
      autoReportToMetrics: true,
    });
    this.serviceClient.setMetricsCollector(metricsCollector);
  }

  /**
   * 获取配置示例
   */
  public async getConfigExample(): Promise<void> {
    // 获取配置
    const config = await this.configCenter.getConfig('my-config', 'DEFAULT_GROUP');
    console.log('Config content:', config.content);
    console.log('Config MD5:', config.md5);

    // 监听配置变更
    const unwatch = this.configCenter.watchConfig('my-config', 'DEFAULT_GROUP', (result) => {
      console.log('Config changed:', result.content);
    });

    // 取消监听
    // unwatch();
  }

  /**
   * 服务注册示例
   */
  public async registerServiceExample(): Promise<void> {
    const instance: ServiceInstance = {
      serviceName: 'my-service',
      ip: '127.0.0.1',
      port: 3000,
      weight: 1,
      healthy: true,
      enabled: true,
      metadata: {
        version: '1.0.0',
      },
    };

    // 注册服务
    await this.serviceRegistry.register(instance);
    console.log('Service registered:', instance.serviceName);

    // 查询服务实例
    const instances = await this.serviceRegistry.getInstances('my-service');
    console.log('Service instances:', instances);

    // 监听服务实例变更
    const unwatch = this.serviceRegistry.watchInstances('my-service', (instances) => {
      console.log('Instances changed:', instances);
    });

    // 取消监听
    // unwatch();
  }

  /**
   * 服务调用示例
   */
  public async callServiceExample(): Promise<void> {
    try {
      // GET 请求示例
      const getResponse = await this.serviceClient.call({
        serviceName: 'user-service',
        method: 'GET',
        path: '/api/users/123',
        loadBalanceStrategy: 'roundRobin',
        timeout: 5000,
      });
      console.log('GET Response:', getResponse.data);

      // POST 请求示例（带熔断器）
      const postResponse = await this.serviceClient.call({
        serviceName: 'user-service',
        method: 'POST',
        path: '/api/users',
        body: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        loadBalanceStrategy: 'weightedRoundRobin',
        timeout: 5000,
        enableCircuitBreaker: true,
        fallback: () => {
          console.log('Fallback: Service unavailable, using default response');
          return { id: 'fallback', name: 'Default User' };
        },
      });
      console.log('POST Response:', postResponse.data);

      // 带查询参数的请求示例（带限流）
      const queryResponse = await this.serviceClient.call({
        serviceName: 'order-service',
        method: 'GET',
        path: '/api/orders',
        query: {
          page: 1,
          limit: 10,
          status: 'active',
        },
        loadBalanceStrategy: 'consistentHash',
        consistentHashKey: 'user-123',
        timeout: 5000,
        enableRateLimit: true,
        rateLimitKey: 'order-service',
      });
      console.log('Query Response:', queryResponse.data);

      // 带熔断器和限流的请求示例
      const protectedResponse = await this.serviceClient.call({
        serviceName: 'payment-service',
        method: 'POST',
        path: '/api/payments',
        body: {
          amount: 100,
          currency: 'USD',
        },
        enableCircuitBreaker: true,
        enableRateLimit: true,
        fallback: () => {
          return { status: 'error', message: 'Service temporarily unavailable' };
        },
      });
      console.log('Protected Response:', protectedResponse.data);
    } catch (error) {
      console.error('Service call failed:', error);
    }
  }

  /**
   * 配置服务治理示例
   */
  public configureGovernance(): void {
    // 配置默认熔断器选项
    this.serviceClient.setDefaultCircuitBreakerOptions({
      failureThreshold: 0.5,
      timeWindow: 60000,
      minimumRequests: 10,
      openDuration: 60000,
      halfOpenRequests: 3,
      timeout: 5000,
    });

    // 配置默认限流器选项
    this.serviceClient.setDefaultRateLimiterOptions({
      requestsPerSecond: 100,
      timeWindow: 1000,
    });

    // 配置默认重试策略
    this.serviceClient.setDefaultRetryStrategy({
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      baseDelay: 1000,
      maxDelay: 30000,
      shouldRetry: (error: Error) => {
        // 只对网络错误和超时错误重试
        return error.message.includes('timeout') || error.message.includes('network');
      },
    });
  }
}

/**
 * 示例控制器
 */
@Controller('/api')
class ApiController {
  public constructor(private readonly myService: MyService) {}

  @GET('/config')
  public async getConfig() {
    await this.myService.getConfigExample();
    return { message: 'Config example executed' };
  }

  @POST('/register')
  public async registerService() {
    await this.myService.registerServiceExample();
    return { message: 'Service registration example executed' };
  }

  @GET('/call')
  public async callService() {
    await this.myService.callServiceExample();
    return { message: 'Service call example executed' };
  }
}

// 创建应用
const app = new Application();

@Module({
  imports: [
    ConfigCenterModule.forRoot({
      provider: 'nacos',
      nacos: {
        client: {
          serverList: ['http://localhost:8848'],
          namespaceId: 'public',
          username: 'nacos',
          password: 'nacos',
        },
      },
    }),
    ServiceRegistryModule.forRoot({
      provider: 'nacos',
      nacos: {
        client: {
          serverList: ['http://localhost:8848'],
          namespaceId: 'public',
          username: 'nacos',
          password: 'nacos',
        },
        watchInterval: 5000,
        heartbeatInterval: 5000,
      },
    }),
  ],
  controllers: [ApiController],
  providers: [MyService],
})
class MyModule {
}

// 注册控制器
app.registerModule(MyModule);

// 启动应用
app.listen(3000).then(() => {
  console.log('🚀 Microservice app started on http://localhost:3000');
  console.log('');
  console.log('⚠️  注意: 此示例需要运行 Nacos 服务器才能正常工作');
  console.log('   Nacos 下载: https://nacos.io/download/nacos-server/');
  console.log('   默认地址: http://localhost:8848');
  console.log('');
  console.log('📝 Available endpoints:');
  console.log('  GET  /api/config   - 配置中心示例（获取配置、监听变更）');
  console.log('  POST /api/register - 服务注册示例（注册服务、查询实例）');
  console.log('  GET  /api/call     - 服务调用示例（负载均衡、熔断、限流）');
  console.log('');
  console.log('🧪 Try it with curl:');
  console.log('  # Get config');
  console.log('  curl http://localhost:3000/api/config');
  console.log('');
  console.log('  # Register service');
  console.log('  curl -X POST http://localhost:3000/api/register');
  console.log('');
  console.log('  # Call service');
  console.log('  curl http://localhost:3000/api/call');
  console.log('');
  console.log('📖 功能说明:');
  console.log('  - ConfigCenter: 配置中心，支持动态配置获取和监听');
  console.log('  - ServiceRegistry: 服务注册中心，支持服务注册/发现');
  console.log('  - ServiceClient: 服务调用客户端，支持负载均衡、熔断、限流、重试');
});

