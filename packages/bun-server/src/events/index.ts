// 类型导出
export {
  EVENT_EMITTER_TOKEN,
  EVENT_OPTIONS_TOKEN,
  ON_EVENT_METADATA_KEY,
  EVENT_LISTENER_CLASS_METADATA_KEY,
  type EventEmitter,
  type EventListener,
  type EventMetadata,
  type EventModuleOptions,
  type ListenerOptions,
  type OnEventMethodMetadata,
  type RegisteredListener,
} from './types';

// 服务导出
export { EventEmitterService } from './service';

// 装饰器导出
export {
  OnEvent,
  getOnEventMetadata,
  isEventListenerClass,
  type OnEventOptions,
} from './decorators';

// 模块导出
export {
  EventModule,
  EventListenerScanner,
  EVENT_LISTENER_SCANNER_TOKEN,
} from './event-module';
