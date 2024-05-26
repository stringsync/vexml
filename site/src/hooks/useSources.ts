import { EXAMPLES, DEFAULT_EXAMPLE_PATH, LOCAL_STORAGE_VEXML_SOURCES_KEY } from '../constants';
import { Source } from '../types';
import { useJsonLocalStorage } from './useJsonLocalStorage';

const DEFAULT_SOURCES: Source[] = [{ type: 'example', path: DEFAULT_EXAMPLE_PATH }];

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
    if (typeof item !== 'object') {
      return false;
    }
    switch (item.type) {
      case 'remote':
        return typeof item.url === 'string';
      case 'local':
        return typeof item.musicXML === 'string';
      case 'example':
        return EXAMPLES.some((example) => example.path === item.path);
      default:
        return false;
    }
  });
