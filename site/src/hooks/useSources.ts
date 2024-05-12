import { LOCAL_STORAGE_VEXML_SOURCES_KEY } from '../constants';
import { Source } from '../types';
import { useJsonLocalStorage } from './useJsonLocalStorage';

export const useSources = () => {
  const [sources, setSources] = useJsonLocalStorage(LOCAL_STORAGE_VEXML_SOURCES_KEY, [], isSources);
  return [sources, setSources] as const;
};

const isSources = (data: unknown): data is Source[] =>
  Array.isArray(data) &&
  data.every((item): item is Source => {
    if (typeof item !== 'object') {
      return false;
    }
    switch (item.type) {
      case 'none':
        return true;
      case 'remote':
        return typeof item.key === 'string' && typeof item.url === 'string';
      case 'raw':
        return typeof item.key === 'string' && typeof item.musicXML === 'string';
      default:
        return false;
    }
  });
