import { useState } from 'react';
import { Source } from '../types';
import { isEqual } from '../util/isEqual';
import { usePending } from './usePending';

export const useMusicXML = (source: Source) => {
  const [currentSource, setCurrentSource] = useState<Source | null>(null);
  const [musicXML, setMusicXML] = useState('');
  const [isPending, withPending] = usePending();

  if (!isEqual(currentSource, source)) {
    setCurrentSource(source);
    switch (source.type) {
      case 'remote':
        withPending(() =>
          fetch(source.url)
            .then((response) => response.text())
            .then(setMusicXML)
        );
        break;
      case 'raw':
        setMusicXML(source.musicXML);
        break;
    }
  }

  return [musicXML, isPending] as const;
};
