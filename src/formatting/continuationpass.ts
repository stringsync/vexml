import * as data from '@/data';
import * as rendering from '@/rendering';
import * as util from '@/util';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { MeasureSplitter } from './measuresplitter';

export type ContinuationPassResult = {
  /** Flattened post-split measures across all systems. */
  measures: data.Measure[];
  /**
   * Synthesized {@link rendering.MeasureRender}s — one per piece — with widths suitable for downstream bin-packing.
   * Most fields beyond `rect.w` and `absoluteIndex` are stubs; the bin-packer only reads those two.
   */
  measureRenders: rendering.MeasureRender[];
};

/**
 * Mutates `document.score.systems` to replace eligible too-wide measures with continuation pieces. Returns the flat
 * post-split measures list paired with synthesized panoramic-width renders for the bin-packer.
 *
 * Caller is expected to pass a cloned document — this function will mutate it.
 */
export function applyContinuationSplit(
  document: data.Document,
  panoramicScoreRender: rendering.ScoreRender,
  config: Config,
  log: Logger
): ContinuationPassResult {
  if (config.CONTINUATION_MEASURE_WIDTH_THRESHOLD === null) {
    return {
      measures: document.score.systems.flatMap((s) => s.measures),
      measureRenders: panoramicScoreRender.systemRenders.flatMap((s) => s.measureRenders),
    };
  }

  const splitter = new MeasureSplitter(config, log);

  const flatOriginalRenders = panoramicScoreRender.systemRenders.flatMap((s) => s.measureRenders);
  const flatOriginalMeasures = document.score.systems.flatMap((s) => s.measures);
  util.assert(
    flatOriginalRenders.length === flatOriginalMeasures.length,
    'panoramic render must have one MeasureRender per data.Measure'
  );

  const splitResults: Array<{ pieces: data.Measure[]; pieceWidths: number[]; reference: rendering.MeasureRender }> = [];

  let renderCursor = 0;
  const newSystems: data.System[] = [];
  for (const system of document.score.systems) {
    const newMeasures: data.Measure[] = [];
    for (const measure of system.measures) {
      const reference = flatOriginalRenders[renderCursor++];
      const result = splitter.split(measure, reference);
      newMeasures.push(...result.pieces);
      splitResults.push({ ...result, reference });
    }
    newSystems.push({ type: 'system', measures: newMeasures });
  }
  document.score.systems = newSystems;

  const measures = newSystems.flatMap((s) => s.measures);
  const measureRenders: rendering.MeasureRender[] = [];
  let absoluteIndex = 0;
  for (const result of splitResults) {
    if (result.pieces.length === 1) {
      measureRenders.push({ ...result.reference, absoluteIndex });
      absoluteIndex++;
      continue;
    }
    for (let pieceIndex = 0; pieceIndex < result.pieces.length; pieceIndex++) {
      measureRenders.push(
        synthesizePieceRender(
          result.reference,
          result.pieceWidths[pieceIndex],
          absoluteIndex,
          pieceIndex,
          result.pieces.length
        )
      );
      absoluteIndex++;
    }
  }

  return { measures, measureRenders };
}

function synthesizePieceRender(
  reference: rendering.MeasureRender,
  pieceWidth: number,
  absoluteIndex: number,
  pieceIndex: number,
  total: number
): rendering.MeasureRender {
  return {
    type: 'measure',
    key: reference.key,
    rect: new Rect(reference.rect.x, reference.rect.y, pieceWidth, reference.rect.h),
    absoluteIndex,
    fragmentRenders: [],
    multiRestCount: 0,
    jumps: [],
    continuation: { type: 'continuation', index: pieceIndex, total },
  };
}
