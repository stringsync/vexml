import * as rendering from '@/rendering';
import * as data from '@/data';
import * as util from '@/util';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Logger, NoopLogger } from '@/debug';
import { Formatter } from './types';
import { PanoramicFormatter } from './panoramicformatter';
import { applyContinuationSplit } from './continuationpass';

type SystemSlice = {
  from: number;
  to: number;
};

export type DefaultFormatterOptions = {
  config?: Config;
  logger?: Logger;
};

/**
 * A formatter that splits the score into systems based on the width of the measures.
 */
export class DefaultFormatter implements Formatter {
  private config: Config;
  private log: Logger;

  constructor(opts?: DefaultFormatterOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = opts?.logger ?? new NoopLogger();

    util.assertNotNull(this.config.WIDTH, 'WIDTH must be set for DefaultFormatter');
  }

  format(document: data.Document): data.Document {
    const clone = document.clone();

    // First, ensure the document is formatted for infinite x-scrolling. This will allow us to measure the width of the
    // measures and make decisions on how to group them into systems.
    const panoramicConfig = {
      ...this.config,
      WIDTH: null,
      HEIGHT: null,
      CONTINUATION_MEASURE_WIDTH_THRESHOLD: null,
    };
    const panoramicFormatter = new PanoramicFormatter({ config: panoramicConfig });
    const panoramicDocument = new rendering.Document(panoramicFormatter.format(document));
    const panoramicScoreRender = new rendering.Score(panoramicConfig, this.log, panoramicDocument, null).render();

    const { measures, measureRenders } = applyContinuationSplit(clone, panoramicScoreRender, this.config, this.log);

    const slices = this.getSystemSlices(this.config, measureRenders);

    this.applySystemSlices(clone, slices, measures);

    return clone;
  }

  private getSystemSlices(config: Config, measureRenders: rendering.MeasureRender[]): SystemSlice[] {
    const slices: SystemSlice[] = [];
    let remaining = 0;
    // Continuation pieces occupy their own system, and the system following a continuation piece must start fresh.
    let lockedFromContinuation = false;

    for (const measure of measureRenders) {
      const required = measure.rect.w;
      const isContinuationPiece = measure.continuation !== null;
      const currentSlice = slices.at(-1);

      const needNewSlice = !currentSlice || isContinuationPiece || lockedFromContinuation || required > remaining;

      if (needNewSlice) {
        slices.push({ from: measure.absoluteIndex, to: measure.absoluteIndex });
        remaining = config.WIDTH! - required;
      } else {
        currentSlice!.to = measure.absoluteIndex;
        remaining -= required;
      }
      lockedFromContinuation = isContinuationPiece;
    }

    this.log.debug(`grouped ${measureRenders.length} measures into ${slices.length} system(s)`);

    return slices;
  }

  private applySystemSlices(document: data.Document, slices: SystemSlice[], measures: data.Measure[]): void {
    document.score.systems = [];

    for (const slice of slices) {
      const system: data.System = {
        type: 'system',
        measures: new Array<data.Measure>(),
      };

      system.measures = measures.slice(slice.from, slice.to + 1);

      document.score.systems.push(system);
    }
  }
}
