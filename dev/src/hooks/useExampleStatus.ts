import { useMemo } from 'react';
import { VexmlStatus } from '../components/Vexml';
import { SnapshotComparison } from '../lib/Snapshot';
import { vexml } from '../lib/vexml';
import { SnapshotComparisonStatus } from './useSnapshotComparisonStatus';

export type ExampleStatus =
  | {
      type: 'unknown';
      exampleId: string;
    }
  | {
      type: 'init';
      exampleId: string;
    }
  | {
      type: 'rendering';
      exampleId: string;
    }
  | {
      type: 'snapshotting';
      exampleId: string;
      svg: SVGElement;
      elapsedMs: number;
    }
  | {
      type: 'success';
      exampleId: string;
      svg: SVGElement;
      elapsedMs: number;
      comparison: SnapshotComparison;
    }
  | {
      type: 'error';
      error: any;
      exampleId: string;
      elapsedMs: number;
    };

export const useExampleStatus = (
  exampleId: string,
  vexmlStatus: VexmlStatus,
  snapshotComparisonStatus: SnapshotComparisonStatus
): ExampleStatus => {
  return useMemo<ExampleStatus>(() => {
    switch (vexmlStatus?.type) {
      case 'init':
        return {
          type: 'init',
          exampleId,
        };
      case 'rendering':
        return {
          type: 'rendering',
          exampleId,
        };
      case 'error':
        return {
          type: 'error',
          exampleId,
          error: vexmlStatus.error,
          elapsedMs: vexmlStatus.elapsedMs,
        };
      case 'success':
        switch (snapshotComparisonStatus.type) {
          case 'init':
          case 'none': // assume that 'none' will trigger a snapshot to be automatically taken
          case 'loading':
            return {
              type: 'snapshotting',
              exampleId,
              elapsedMs: vexmlStatus.elapsedMs,
              svg: vexmlStatus.svg,
            };
          case 'success':
            return {
              type: 'success',
              exampleId,
              elapsedMs: vexmlStatus.elapsedMs,
              svg: vexmlStatus.svg,
              comparison: snapshotComparisonStatus.comparison,
            };
          case 'error':
            return {
              type: 'error',
              exampleId,
              error: snapshotComparisonStatus.error,
              elapsedMs: vexmlStatus.elapsedMs,
            };
        }
    }
  }, [exampleId, vexmlStatus, snapshotComparisonStatus]);
};
