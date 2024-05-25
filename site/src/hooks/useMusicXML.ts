import { useState } from 'react';
import { Example, Source } from '../types';
import { isEqual } from '../util/isEqual';
import { usePending } from './usePending';
import * as errors from '../util/errors';

export const useMusicXML = (source: Source) => {
  const [currentSource, setCurrentSource] = useState<Source | null>(null);
  const [musicXML, setMusicXML] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isPending, withPending] = usePending();

  const onLocal = (musicXML: string) => {
    setMusicXML(musicXML);
  };

  const onExample = (example: Example) => {
    switch (example.type) {
      case 'none':
        setMusicXML('');
        break;
      case 'single':
        // TODO: Fix this.
        setMusicXML(example.path);
        break;
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
        onExample(source.example);
        break;
      case 'remote':
        onRemote(source.url);
        break;
    }
  }

  return [musicXML, isPending, error] as const;
};
