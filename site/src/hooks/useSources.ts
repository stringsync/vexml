import * as vexml from '@/index';
import { DEFAULT_EXAMPLE_PATH, LOCAL_STORAGE_VEXML_SOURCES_KEY } from '../constants';
import { Source } from '../types';
import { useJsonLocalStorage } from './useJsonLocalStorage';

const DEFAULT_SOURCES: Source[] = [
  { type: 'example', path: DEFAULT_EXAMPLE_PATH, backend: 'svg', config: vexml.DEFAULT_CONFIG, height: 0 },
];

export const useSources = () => {
  const [sources, setSources] = useJsonLocalStorage(LOCAL_STORAGE_VEXML_SOURCES_KEY, [], isSources);

  if (sources.length === 0) {
    setSources(DEFAULT_SOURCES);
  }

  return [sources, setSources] as const;
};

const isSources = (data: unknown): data is Source[] =>
  Array.isArray(data) &&
  data.every((item): item is Source => {
    if (typeof item !== 'object' && item !== null) {
      return false;
    }
    if (item.backend !== 'svg' && item.backend !== 'canvas') {
      return false;
    }
    if (typeof item.height !== 'undefined' && typeof item.height !== 'number') {
      return false;
    }
    if (!isConfig(item.config)) {
      return false;
    }
    switch (item.type) {
      case 'remote':
        return typeof item.url === 'string';
      case 'local':
        return typeof item.musicXML === 'string';
      case 'example':
        return typeof item.path === 'string';
      default:
        return false;
    }
  });

const isConfig = (config: any): config is vexml.Config => {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const check = (key: string, descriptor: vexml.SchemaDescriptor): boolean => {
    switch (descriptor.type) {
      case 'string':
      case 'number':
      case 'boolean':
        return typeof config[key] === descriptor.type;
      case 'enum':
        return descriptor.choices.includes(config[key]);
      case 'debug':
        return check(config[key], descriptor.child);
    }
  };

  for (const [key, descriptor] of Object.entries(vexml.CONFIG_SCHEMA)) {
    if (!check(key, descriptor)) {
      return false;
    }
  }

  return true;
};
