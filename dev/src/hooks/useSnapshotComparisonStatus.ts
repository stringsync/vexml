import { useEffect, useState } from 'react';
import { Snapshot, SnapshotComparison } from '../lib/Snapshot';

export type SnapshotComparisonStatus =
  | {
      type: 'init';
    }
  | {
      type: 'none';
    }
  | {
      type: 'loading';
    }
  | {
      type: 'success';
      comparison: SnapshotComparison;
    }
  | {
      type: 'error';
      error: string;
    };

export const useSnapshotComparisonStatus = (
  snapshot1: Snapshot | null,
  snapshot2: Snapshot | null
): SnapshotComparisonStatus => {
  const [status, setStatus] = useState<SnapshotComparisonStatus>({ type: 'init' });

  useEffect(() => {
    if (!snapshot1 || !snapshot2) {
      setStatus({ type: 'none' });
      return;
    }
    setStatus({ type: 'loading' });
    let done = false;
    snapshot1
      .compare(snapshot2)
      .then((comparison) => !done && setStatus({ type: 'success', comparison }))
      .catch((e) =>
        setStatus({ type: 'error', error: e instanceof Error ? e.message : `something went wrong: ${String(e)}` })
      )
      .finally(() => (done = true));
    return () => {
      done = true;
    };
  }, [snapshot1, snapshot2]);

  return status;
};
