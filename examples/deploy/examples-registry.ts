import registryJson from './examples-registry.json';

export interface ExampleRegistryItem {
  scriptName: string;
  slug: string;
  name: string;
  group: string;
  port: number;
  enabled: boolean;
  exposed: boolean;
}

export const EXAMPLE_DOMAIN_PREFIX = 'disb-examples-';
export const EXAMPLE_DOMAIN_SUFFIX = '.dangaogm.com';

export const examplesRegistry = registryJson as ExampleRegistryItem[];

export function getExampleDomain(slug: string): string {
  return `${EXAMPLE_DOMAIN_PREFIX}${slug}${EXAMPLE_DOMAIN_SUFFIX}`;
}

export function getExampleUrl(slug: string): string {
  return `https://${getExampleDomain(slug)}`;
}
