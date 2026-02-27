import { Module, MODULE_METADATA_KEY } from '../di/module';
import type { ModuleProvider } from '../di/module';
import { RequestRecorder } from './recorder';
import { createDebugMiddleware } from './middleware';
import { createDebugUIMiddleware } from './debug-ui-middleware';
import {
  DEBUG_OPTIONS_TOKEN,
  DEBUG_RECORDER_TOKEN,
  type DebugModuleOptions,
} from './types';

/**
 * Debug 模块
 * 开发模式下录制 HTTP 请求，支持查看和重放
 */
@Module({
  providers: [],
  extensions: [],
  middlewares: [],
})
export class DebugModule {
  /**
   * 创建 Debug 模块
   * @param options - 模块配置
   */
  public static forRoot(options: DebugModuleOptions = {}): typeof DebugModule {
    const enabled = options.enabled ?? true;
    const maxRecords = options.maxRecords ?? 500;
    const recordBody = options.recordBody ?? true;
    const path = options.path ?? '/_debug';

    const normalizedPath = path.endsWith('/') && path.length > 1
      ? path.slice(0, -1)
      : path;

    const recorder = new RequestRecorder(maxRecords);

    const opts = {
      enabled,
      maxRecords,
      recordBody,
      path: normalizedPath,
    };

    const debugUIMiddleware = createDebugUIMiddleware(recorder, normalizedPath);
    const recordingMiddleware = createDebugMiddleware(recorder, {
      recordBody,
      basePath: normalizedPath,
    });

    const providers: ModuleProvider[] = [
      { provide: DEBUG_OPTIONS_TOKEN, useValue: opts },
      { provide: DEBUG_RECORDER_TOKEN, useValue: recorder },
    ];

    const middlewares = enabled
      ? [debugUIMiddleware, recordingMiddleware]
      : [];

    const existingMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, DebugModule) ?? {};
    const metadata = {
      ...existingMetadata,
      providers: [...(existingMetadata.providers ?? []), ...providers],
      middlewares: [...(existingMetadata.middlewares ?? []), ...middlewares],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, DebugModule);

    return DebugModule;
  }
}
