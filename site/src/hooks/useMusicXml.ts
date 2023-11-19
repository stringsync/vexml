import { useCallback, useState } from 'react';
import { LOCAL_STORAGE_SAVED_MUSICXML_KEY, LOCAL_STORAGE_USE_DEFAULT_MUSICXML_KEY } from '../constants';
import { useLocalStorage } from './useLocalStorage';

export const useMusicXml = (): {
  value: string;
  storedValue: string;
  useDefault: boolean;
  set: (value: string) => void;
  save: () => void;
  reset: () => void;
} => {
  const [storedMusicXml, setStoredMusicXml] = useLocalStorage(LOCAL_STORAGE_SAVED_MUSICXML_KEY, '');
  const [useDefault, setUseDefault] = useLocalStorage(LOCAL_STORAGE_USE_DEFAULT_MUSICXML_KEY, 'true');
  const [musicXml, setMusicXml] = useState(() => storedMusicXml);

  const set = useCallback(
    (nextMusicXml: string) => {
      setUseDefault('false');
      setMusicXml(nextMusicXml);
    },
    [setUseDefault]
  );

  const save = useCallback(() => {
    setUseDefault('false');
    setStoredMusicXml(musicXml);
  }, [setUseDefault, setStoredMusicXml, musicXml]);

  const reset = useCallback(() => {
    setUseDefault('true');
    setStoredMusicXml('');
  }, [setUseDefault, setStoredMusicXml]);

  return {
    value: musicXml,
    storedValue: storedMusicXml,
    useDefault: useDefault === 'true',
    set,
    reset,
    save,
  };
};
