import { useCallback, useState } from 'react';
import { LOCAL_STORAGE_SAVED_MUSICXML_KEY, LOCAL_STORAGE_USE_DEFAULT_MUSICXML_KEY } from '../constants';
import { useLocalStorage } from './useLocalStorage';
import { useDebouncedState } from './useDebouncedState';

const SET_DEBOUNCE_DELAY_MS = 100;

export const useMusicXml = (): {
  value: string;
  debouncedValue: string;
  storedValue: string;
  useDefault: boolean;
  set: (value: string) => void;
  save: () => void;
  reset: () => void;
} => {
  const [storedMusicXml, setStoredMusicXml] = useLocalStorage(LOCAL_STORAGE_SAVED_MUSICXML_KEY, '');
  const [musicXml, debouncedMusicXml, setMusicXml] = useDebouncedState(storedMusicXml, SET_DEBOUNCE_DELAY_MS);

  const [storedUseDefault, setStoredUseDefault] = useLocalStorage(LOCAL_STORAGE_USE_DEFAULT_MUSICXML_KEY, 'true');
  const [useDefault, setUseDefault] = useState(storedUseDefault);

  const set = useCallback(
    (nextMusicXml: string) => {
      setUseDefault('false');
      setMusicXml(nextMusicXml);
    },
    [setUseDefault, setMusicXml]
  );

  const save = useCallback(() => {
    setStoredUseDefault('false');
    setStoredMusicXml(musicXml);
  }, [setStoredUseDefault, setStoredMusicXml, musicXml]);

  const reset = useCallback(() => {
    setUseDefault('true');
    setStoredUseDefault('true');
    setMusicXml('');
    setStoredMusicXml('');
  }, [setUseDefault, setStoredUseDefault, setMusicXml, setStoredMusicXml]);

  return {
    value: musicXml,
    debouncedValue: debouncedMusicXml,
    storedValue: storedMusicXml,
    useDefault: useDefault === 'true',
    set,
    reset,
    save,
  };
};
