export { ServiceRegistryModule } from './service-registry-module';
export type { ServiceRegistryModuleOptions, ServiceRegistryProvider, NacosServiceRegistryOptions } from './service-registry-module';
export { NacosServiceRegistry } from './nacos-service-registry';
export { SERVICE_REGISTRY_TOKEN } from './types';
export type { GetInstancesOptions, InstancesChangeListener, ServiceInstance, ServiceRegistry } from './types';
export {
  ServiceRegistry as ServiceRegistryDecorator,
  getServiceRegistryMetadata,
  registerServiceInstance,
  deregisterServiceInstance,
} from './decorators';
export {
  ServiceDiscovery,
  getServiceDiscoveryMetadata,
  type ServiceDiscoveryMetadata,
} from './discovery-decorators';
export { ServiceRegistryHealthIntegration } from './health-integration';
export type { ServiceRegistryMetadata } from './decorators';

