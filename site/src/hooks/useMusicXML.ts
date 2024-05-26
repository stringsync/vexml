import { useState } from 'react';
import { Source } from '../types';
import { isEqual } from '../util/isEqual';
import { usePending } from './usePending';
import * as errors from '../util/errors';
import { EXAMPLES } from '../constants';

export const useMusicXML = (source: Source) => {
  const [currentSource, setCurrentSource] = useState<Source | null>(null);
  const [musicXML, setMusicXML] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isPending, withPending] = usePending();

  const onLocal = (musicXML: string) => {
    setMusicXML(musicXML);
  };

  const onExample = (path: string) => {
    const example = EXAMPLES.find((example) => example.path === path);
    if (example) {
      withPending(() => example.get().then(setMusicXML));
    } else {
      setMusicXML('');
    }
  };

  const onRemote = (url: string) => {
    if (url.length > 0) {
      withPending(() =>
        fetch(url)
          .then((response) => response.text())
          .then(setMusicXML)
          .catch((e) => setError(errors.wrap(e)))
      );
    } else {
      setMusicXML('');
    }
  };

  if (!isEqual(currentSource, source)) {
    setCurrentSource(source);
    switch (source.type) {
      case 'local':
        onLocal(source.musicXML);
        break;
      case 'example':
        onExample(source.path);
        break;
      case 'remote':
        onRemote(source.url);
        break;
    }
  }

  return [musicXML, isPending, error] as const;
};
