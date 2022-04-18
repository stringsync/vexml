import { Alert, Statistic } from 'antd';
import React, { useEffect, useId, useState } from 'react';
import { Snapshot, SnapshotComparison } from '../lib/Snapshot';

const BAD_COLOR = '#cf1322';
const GOOD_COLOR = '#3f8600';

type ComparisonResult =
  | {
      type: 'none';
    }
  | {
      type: 'success';
      comparison: SnapshotComparison;
    }
  | {
      type: 'error';
      error: string;
    };

export type DiffProps = {
  snapshot1: Snapshot;
  snapshot2: Snapshot;
};

export const Diff: React.FC<DiffProps> = (props) => {
  const { snapshot1, snapshot2 } = props;
  const id = useId();

  const [result, setResult] = useState<ComparisonResult>({ type: 'none' });
  useEffect(() => {
    setResult({ type: 'none' });
    let done = false;
    snapshot1
      .compare(snapshot2)
      .then((comparison) => !done && setResult({ type: 'success', comparison }))
      .catch((e) =>
        setResult({ type: 'error', error: e instanceof Error ? e.message : `something went wrong: ${String(e)}` })
      )
      .finally(() => (done = true));
    return () => {
      done = true;
    };
  }, [id, snapshot1, snapshot2]);

  useEffect(() => {
    if (result.type !== 'success') {
      return;
    }
    const canvas = document.getElementById(id)! as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(result.comparison.imageData, 0, 0);
  }, [result]);

  return (
    <>
      {result.type === 'error' && <Alert type="error" message={result.error} />}
      {result.type === 'success' && (
        <>
          <Statistic
            title="match"
            value={result.comparison.diff * 100}
            precision={result.comparison.diff === 1 ? 0 : 2}
            suffix="%"
            valueStyle={{ color: result.comparison.diff === 1 ? GOOD_COLOR : BAD_COLOR }}
          />
          <canvas id={id} width={result.comparison.width} height={result.comparison.height} />
        </>
      )}
    </>
  );
};
