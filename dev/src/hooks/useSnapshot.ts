import { useCallback, useEffect, useState } from 'react';
import { Snapshot } from '../lib/Snapshot';

export const useSnapshot = (src: string | SVGElement | null): [snapshot: Snapshot | null, retry: () => void] => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [retryRequestedAt, setRetryRequestedAt] = useState(() => new Date().getTime());

  useEffect(() => {
    let done = false;
    if (typeof src === 'string') {
      fetch(src)
        .then((res) => {
          const contentType = res.headers.get('content-type');
          if (contentType !== 'image/png') {
            throw new Error(`expected image/png, got: ${contentType}`);
          }
          return res.blob();
        })
        .then((blob) => new Snapshot(blob))
        .then((nextSnapshot) => !done && setSnapshot(nextSnapshot))
        .catch(() => setSnapshot(null))
        .finally(() => (done = true));
    } else if (src instanceof SVGElement) {
      Snapshot.fromSvg(src)
        .then((nextSnapshot) => !done && setSnapshot(nextSnapshot))
        .catch(() => setSnapshot(null))
        .finally(() => (done = true));
    } else {
      setSnapshot(null);
      done = true;
    }
    return () => {
      done = true;
    };
  }, [src, retryRequestedAt]);

  const retry = useCallback(() => {
    setRetryRequestedAt(new Date().getTime());
  }, []);

  return [snapshot, retry];
};
