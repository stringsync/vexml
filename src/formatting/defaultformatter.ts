import * as rendering from '@/rendering';
import * as data from '@/data';
import * as util from '@/util';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Logger, NoopLogger } from '@/debug';
import { Formatter } from './types';
import { PanoramicFormatter } from './panoramicformatter';

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
    const panoramicConfig = { ...this.config, WIDTH: null, HEIGHT: null };
    const panoramicFormatter = new PanoramicFormatter({ config: panoramicConfig });
    const panoramicDocument = new rendering.Document(panoramicFormatter.format(document));
    const panoramicScoreRender = new rendering.Score(panoramicConfig, this.log, panoramicDocument, null).render();

    const slices = this.getSystemSlices(this.config, panoramicScoreRender);

    this.applySystemSlices(clone, slices);

    return clone;
  }

  private getSystemSlices(config: Config, scoreRender: rendering.ScoreRender): SystemSlice[] {
    const slices = [{ from: 0, to: 0 }];

    let remaining = config.WIDTH!;
    let count = 0;

    const measureRenders = scoreRender.systemRenders.flatMap((systemRender) => systemRender.measureRenders);

    for (let measureIndex = 0; measureIndex < measureRenders.length; measureIndex++) {
      const measure = measureRenders[measureIndex];

      const required = measure.rect.w;

      if (required > remaining && count > 0) {
        slices.push({ from: measure.absoluteIndex, to: measure.absoluteIndex });
        remaining = config.WIDTH!;
        count = 0;
      }

      slices.at(-1)!.to = measure.absoluteIndex;
      remaining -= required;
      count++;
    }

    this.log.debug(`grouped ${measureRenders.length} measures into ${slices.length} system(s)`);

    return slices;
  }

  private applySystemSlices(document: data.Document, slices: SystemSlice[]): void {
    const measures = document.score.systems.flatMap((s) => s.measures);

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
