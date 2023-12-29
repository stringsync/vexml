import { useState } from 'react';
import { LOCAL_STORAGE_SAVED_MUSICXML_KEY, LOCAL_STORAGE_USE_DEFAULT_MUSICXML_KEY } from '../constants';
import { useLocalStorage } from './useLocalStorage';
import { useDebouncedState } from './useDebouncedState';

const SET_DEBOUNCE_DELAY_MS = 100;

type UpdateType = 'default' | 'normal';

export const useMusicXML = (): {
  value: { current: string; debounced: string; stored: string };
  useDefault: boolean;
  update: (type: UpdateType, value: string) => void;
  save: () => void;
  reset: () => void;
} => {
  const [storedMusicXML, setStoredMusicXML] = useLocalStorage(LOCAL_STORAGE_SAVED_MUSICXML_KEY, '');
  const [musicXML, debouncedMusicXML, setMusicXML] = useDebouncedState(storedMusicXML, SET_DEBOUNCE_DELAY_MS);

  const [storedUseDefault, setStoredUseDefault] = useLocalStorage(LOCAL_STORAGE_USE_DEFAULT_MUSICXML_KEY, 'true');
  const [useDefault, setUseDefault] = useState(storedUseDefault);

  const update = (type: UpdateType, value: string) => {
    if (type === 'default') {
      setUseDefault('true');
    } else {
      setUseDefault('false');
    }
    setMusicXML(value);
  };

  const save = () => {
    setStoredUseDefault('false');
    setStoredMusicXML(musicXML);
  };

  const reset = () => {
    setUseDefault('true');
    setStoredUseDefault('true');
    setMusicXML('');
    setStoredMusicXML('');
  };

  return {
    value: { current: musicXML, debounced: debouncedMusicXML, stored: storedMusicXML },
    useDefault: useDefault === 'true',
    update,
    reset,
    save,
  };
};
