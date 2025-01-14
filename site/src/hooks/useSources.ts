import * as vexml from '@/index';
import { DEFAULT_CONFIG, DEFAULT_EXAMPLE_PATH, LOCAL_STORAGE_VEXML_SOURCES_KEY } from '../constants';
import { Source } from '../types';
import { useJsonLocalStorage } from './useJsonLocalStorage';

const DEFAULT_SOURCES: Source[] = [{ type: 'example', path: DEFAULT_EXAMPLE_PATH, config: DEFAULT_CONFIG }];

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
    if (descriptor.defaultValue === null && config[key] === null) {
      return true;
    }
    switch (descriptor.type) {
      case 'string':
      case 'number':
      case 'boolean':
        return typeof config[key] === descriptor.type;
      case 'enum':
        return descriptor.choices.includes(config[key]);
    }
  };

  for (const [key, descriptor] of Object.entries(vexml.CONFIG)) {
    if (!check(key, descriptor)) {
      return false;
    }
  }

  return true;
};
