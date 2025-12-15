export { Application, type ApplicationOptions } from './core/application';
export { BunServer, type ServerOptions } from './core/server';
export { Context } from './core/context';
export { ContextService, CONTEXT_SERVICE_TOKEN, contextStore } from './core/context-service';
export { Route, Router, RouteRegistry } from './router';
export { GET, POST, PUT, DELETE, PATCH } from './router/decorators';
export type { HttpMethod, RouteHandler, RouteMatch } from './router/types';
export { BodyParser, RequestWrapper, ResponseBuilder } from './request';
export {
  Body,
  Query,
  QueryMap,
  Param,
  Header,
  HeaderMap,
  ParamBinder,
  Controller,
  ControllerRegistry,
} from './controller';
export { Context as ContextParam } from './controller';
export type {
  ParamMetadata,
  QueryMapOptions,
  HeaderMapOptions,
  ControllerMetadata,
} from './controller';
export { Container } from './di/container';
export { Injectable, Inject } from './di/decorators';
export { Lifecycle, type ProviderConfig, type DependencyMetadata } from './di/types';
export {
  Module,
  type ModuleMetadata,
  type ModuleProvider,
  type ModuleClass,
} from './di/module';
export { ModuleRegistry } from './di/module-registry';
export {
  InterceptorRegistry,
  InterceptorChain,
  scanInterceptorMetadata,
  BaseInterceptor,
  Cache,
  CacheInterceptor,
  Permission,
  PermissionInterceptor,
  Log,
  LogInterceptor,
  INTERCEPTOR_REGISTRY_TOKEN,
  CACHE_METADATA_KEY,
  PERMISSION_METADATA_KEY,
  LOG_METADATA_KEY,
  type Interceptor,
  type InterceptorMetadata,
  type CacheOptions,
  type PermissionOptions,
  type PermissionService,
  type LogOptions,
} from './interceptor';
export { UseMiddleware, RateLimit, MiddlewarePipeline } from './middleware';
export type { Middleware, NextFunction } from './middleware';
export {
  createLoggerMiddleware,
  createRequestLoggingMiddleware,
  createErrorHandlingMiddleware,
  createCorsMiddleware,
  createFileUploadMiddleware,
  createStaticFileMiddleware,
  createRateLimitMiddleware,
  createTokenKeyGenerator,
  createUserKeyGenerator,
  type RateLimitOptions,
  type RateLimitStore,
} from './middleware/builtin';
export {
  Validate,
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  MinLength,
  ValidationError,
  type ValidationIssue,
} from './validation';
export {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  ExceptionFilterRegistry,
  type ExceptionFilter,
} from './error';
export {
  WebSocketGateway,
  OnOpen,
  OnMessage,
  OnClose,
  WebSocketGatewayRegistry,
  type WebSocketConnectionData,
} from './websocket';
export {
  LoggerExtension,
  LoggerModule,
  LogLevel,
  LOGGER_TOKEN,
  type Logger,
  type LoggerOptions,
  type LoggerModuleOptions,
  type LogEntry,
} from './extensions';
export {
  SwaggerExtension,
  SwaggerModule,
  SwaggerGenerator,
  createSwaggerUIMiddleware,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  type SwaggerOptions,
  type SwaggerModuleOptions,
  type SwaggerDocument,
  type ApiOperationMetadata,
  type ApiParamMetadata,
  type ApiBodyMetadata,
  type ApiResponseMetadata,
} from './swagger';
// Security 模块（推荐使用）
export {
  SecurityModule,
  SecurityContextHolder,
  AuthenticationManager,
  RoleBasedAccessDecisionManager,
  JwtAuthenticationProvider,
  OAuth2AuthenticationProvider,
  createSecurityFilter,
  type SecurityModuleConfig,
  type SecurityConfig,
  type SecurityContext,
  type Authentication,
  type AuthenticationProvider,
  type AuthenticationRequest,
  type Principal,
  type Credentials,
  type AccessDecisionManager,
} from './security';
export {
  ConfigModule,
  ConfigService,
  CONFIG_SERVICE_TOKEN,
  type ConfigModuleOptions,
} from './config';
export {
  HealthModule,
  type HealthIndicator,
  type HealthIndicatorResult,
  type HealthStatus,
  type HealthModuleOptions,
  HEALTH_INDICATORS_TOKEN,
  HEALTH_OPTIONS_TOKEN,
} from './health';
export {
  MetricsModule,
  MetricsCollector,
  PrometheusFormatter,
  createHttpMetricsMiddleware,
  METRICS_SERVICE_TOKEN,
  METRICS_OPTIONS_TOKEN,
  type MetricsModuleOptions,
  type MetricType,
  type MetricLabels,
  type MetricValue,
  type MetricDataPoint,
  type CustomMetric,
} from './metrics';
export {
  DatabaseModule,
  DatabaseService,
  DatabaseConnectionManager,
  ConnectionPool,
  DatabaseHealthIndicator,
  DatabaseExtension,
  DATABASE_SERVICE_TOKEN,
  DATABASE_OPTIONS_TOKEN,
  type DatabaseModuleOptions,
  type DatabaseConfig,
  type DatabaseType,
  type ConnectionInfo,
  type ConnectionPoolOptions,
  type SqliteConfig,
  type PostgresConfig,
  type MysqlConfig,
  // ORM exports
  Entity,
  Column,
  PrimaryKey,
  Repository,
  BaseRepository,
  DrizzleBaseRepository,
  OrmService,
  ORM_SERVICE_TOKEN,
  getEntityMetadata,
  getColumnMetadata,
  getRepositoryMetadata,
  type OrmModuleOptions,
  type BaseRepository as BaseRepositoryInterface,
  type EntityMetadata,
  type ColumnMetadata,
  // Transaction exports
  Transactional,
  TransactionManager,
  TransactionInterceptor,
  Propagation,
  IsolationLevel,
  TransactionStatus,
  TRANSACTION_SERVICE_TOKEN,
  getTransactionMetadata,
  type TransactionOptions,
  type TransactionContext,
} from './database';
// Auth 模块（底层实现，供 Security 模块使用）
export {
  JWTUtil,
  OAuth2Service,
  OAuth2Controller,
  Auth,
  getAuthMetadata,
  requiresAuth,
  checkRoles,
  OAUTH2_SERVICE_TOKEN,
  JWT_UTIL_TOKEN,
  type JWTConfig,
  type JWTPayload,
  type OAuth2Client,
  type OAuth2AuthorizationRequest,
  type OAuth2TokenRequest,
  type OAuth2TokenResponse,
  type UserInfo,
  type AuthContext,
  type AuthConfig,
} from './auth';
export {
  PerformanceHarness,
  StressTester,
  type BenchmarkResult,
  type StressResult,
} from './testing/harness';
// Cache 模块
export {
  CacheModule,
  CacheService,
  Cacheable,
  CacheEvict,
  CachePut,
  MemoryCacheStore,
  RedisCacheStore,
  CACHE_SERVICE_TOKEN,
  CACHE_OPTIONS_TOKEN,
} from './cache';
export type {
  CacheModuleOptions,
  CacheStore,
  RedisCacheStoreOptions,
  CacheableOptions,
  CacheEvictOptions,
  CachePutOptions,
} from './cache';
// Queue 模块
export {
  QueueModule,
  QueueService,
  Queue,
  Cron,
  MemoryQueueStore,
  QUEUE_SERVICE_TOKEN,
  QUEUE_OPTIONS_TOKEN,
} from './queue';
export type {
  QueueModuleOptions,
  QueueStore,
  Job,
  JobData,
  JobHandler,
  JobOptions,
  CronOptions,
  QueueOptions,
  CronDecoratorOptions,
} from './queue';
// Session 模块
export {
  SessionModule,
  SessionService,
  createSessionMiddleware,
  SessionDecorator as Session,
  MemorySessionStore,
  RedisSessionStore,
  SESSION_SERVICE_TOKEN,
  SESSION_OPTIONS_TOKEN,
} from './session';
export type {
  SessionModuleOptions,
  SessionStore,
  Session as SessionType,
  SessionData,
  RedisSessionStoreOptions,
} from './session';

