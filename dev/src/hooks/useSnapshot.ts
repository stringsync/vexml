import { useCallback, useEffect, useState } from 'react';
import { Snapshot } from '../lib/Snapshot';

export type SnapshotStatus =
  | { type: 'init' }
  | { type: 'loading' }
  | { type: 'success'; snapshot: Snapshot }
  | { type: 'error'; error: any };

export const useSnapshot = (src: string | SVGElement | null): [status: SnapshotStatus, retry: () => void] => {
  const [status, setStatus] = useState<SnapshotStatus>({ type: 'init' });
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
        .then((snapshot) => !done && setStatus({ type: 'success', snapshot }))
        .catch((error) => setStatus({ type: 'error', error }))
        .finally(() => (done = true));
    } else if (src instanceof SVGElement) {
      Snapshot.fromSvg(src)
        .then((snapshot) => !done && setStatus({ type: 'success', snapshot }))
        .catch((error) => setStatus({ type: 'error', error }))
        .finally(() => (done = true));
    } else {
      setStatus({ type: 'error', error: `invalid src: ${src}` });
      done = true;
    }
    return () => {
      done = true;
    };
  }, [src, retryRequestedAt]);

  const retry = useCallback(() => {
    setRetryRequestedAt(new Date().getTime());
  }, []);

  return [status, retry];
};
