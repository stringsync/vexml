import { LOCAL_STORAGE_VEXML_SOURCES_KEY } from '../constants';
import { Source } from '../types';
import { useJsonLocalStorage } from './useJsonLocalStorage';

const PITCHES_MUSICXML_URL = new URL('../examples/lilypond/01a-Pitches-Pitches.musicxml', import.meta.url);

const DEFAULT_SOURCES: Source[] = [{ type: 'remote', url: PITCHES_MUSICXML_URL.href }];

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
        switch (item.example.type) {
          case 'none':
            return true;
          case 'single':
            return typeof item.example.path === 'string';
          default:
            return false;
        }
      default:
        return false;
    }
  });
