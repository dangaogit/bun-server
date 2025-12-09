export { Application, type ApplicationOptions } from './core/application';
export { BunServer, type ServerOptions } from './core/server';
export { Context } from './core/context';
export { Route, Router, RouteRegistry } from './router';
export { GET, POST, PUT, DELETE, PATCH } from './router/decorators';
export type { HttpMethod, RouteHandler, RouteMatch } from './router/types';
export { BodyParser, RequestWrapper, ResponseBuilder } from './request';
export { Body, Query, Param, Header, ParamBinder, Controller, ControllerRegistry } from './controller';
export type { ParamMetadata, ControllerMetadata } from './controller';
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
export { UseMiddleware, MiddlewarePipeline } from './middleware';
export type { Middleware, NextFunction } from './middleware';
export {
  createLoggerMiddleware,
  createRequestLoggingMiddleware,
  createErrorHandlingMiddleware,
  createCorsMiddleware,
  createFileUploadMiddleware,
  createStaticFileMiddleware,
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

