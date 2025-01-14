import * as rendering from '@/rendering';
import * as data from '@/data';
import * as util from '@/util';
import { Logger, NoopLogger } from '@/debug';
import { Formatter } from './types';
import { PanoramicFormatter } from './panoramicformatter';

type SystemSlice = {
  from: number;
  to: number;
};

/**
 * A formatter that splits the score into systems based on the width of the measures.
 */
export class DefaultFormatter implements Formatter {
  private log: Logger;

  constructor(log?: Logger) {
    this.log = log ?? new NoopLogger();
  }

  format(config: rendering.Config, document: data.Document): data.Document {
    util.assertNotNull(config.WIDTH, 'WIDTH must be set for DefaultFormatter');

    const clone = document.clone();

    // First, ensure the document is formatted for infinite x-scrolling. This will allow us to measure the width of the
    // measures and make decisions on how to group them into systems.
    const panoramicConfig = { ...config, WIDTH: null, HEIGHT: null };
    const panoramicFormatter = new PanoramicFormatter();
    const panoramicDocument = new rendering.Document(panoramicFormatter.format(panoramicConfig, document));
    const panoramicScoreRender = new rendering.Score(panoramicConfig, this.log, panoramicDocument, null).render();

    const slices = this.getSystemSlices(config, panoramicScoreRender);

    this.applySystemSlices(clone, slices);

    return clone;
  }

  private getSystemSlices(config: rendering.Config, scoreRender: rendering.ScoreRender): SystemSlice[] {
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
