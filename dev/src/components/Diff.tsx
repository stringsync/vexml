import { Alert, Statistic } from 'antd';
import React, { useEffect, useId } from 'react';
import { SnapshotComparisonStatus } from '../hooks/useComparisonStatus';

const BAD_COLOR = '#cf1322';
const GOOD_COLOR = '#3f8600';

export type DiffProps = {
  snapshotComparisonStatus: SnapshotComparisonStatus;
};

export const Diff: React.FC<DiffProps> = (props) => {
  const status = props.snapshotComparisonStatus;
  const id = useId();

  useEffect(() => {
    if (status.type !== 'success') {
      return;
    }
    const canvas = document.getElementById(id)! as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(status.comparison.imageData, 0, 0);
  }, [status]);

  return (
    <>
      {status.type === 'error' && <Alert type="error" message={status.error} />}
      {status.type === 'success' && (
        <>
          <Statistic
            title="match"
            value={status.comparison.match * 100}
            precision={status.comparison.match === 1 ? 0 : 2}
            suffix="%"
            valueStyle={{ color: status.comparison.match === 1 ? GOOD_COLOR : BAD_COLOR }}
          />
          <canvas id={id} width={status.comparison.width} height={status.comparison.height} />
        </>
      )}
    </>
  );
};
