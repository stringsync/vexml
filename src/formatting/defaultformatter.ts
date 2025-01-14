import * as rendering from '@/rendering';
import * as data from '@/data';
import * as util from '@/util';
import { Logger } from '@/debug';
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
  constructor(private config: rendering.Config, private log: Logger) {
    util.assertNotNull(this.config.WIDTH);
  }

  format(document: data.Document): data.Document {
    // First, ensure the document is formatted for infinite x-scrolling. This will allow us to measure the width of the
    // measures and make decisions on how to group them into systems.
    const panoramicFormatter = new PanoramicFormatter(this.config, this.log);
    const singleSystemDocument = panoramicFormatter.format(document);

    // We'll create a score that thinks the configured dimensions are undefined. This is necessary since the score (and
    // its children) may need to render elements into order to compute rects. This will provide the formatter a
    // mechanism to measure the elements and make decisions on the system layout.
    const scoreRender = new rendering.Score(
      { ...this.config, WIDTH: null, HEIGHT: null },
      this.log,
      new rendering.Document(singleSystemDocument),
      null
    ).render();

    const slices = this.getSystemSlices(scoreRender);
    return this.applySystemSlices(document, slices);
  }

  private getSystemSlices(scoreRender: rendering.ScoreRender): SystemSlice[] {
    const slices = [{ from: 0, to: 0 }];

    let remaining = this.config.WIDTH!;
    let count = 0;

    const measureRenders = scoreRender.systemRenders.flatMap((systemRender) => systemRender.measureRenders);

    for (let measureIndex = 0; measureIndex < measureRenders.length; measureIndex++) {
      const measure = measureRenders[measureIndex];

      const required = measure.rect.w;

      if (required > remaining && count > 0) {
        slices.push({ from: measure.absoluteIndex, to: measure.absoluteIndex });
        remaining = this.config.WIDTH!;
        count = 0;
      }

      slices.at(-1)!.to = measure.absoluteIndex;
      remaining -= required;
      count++;
    }

    this.log.debug(`grouped ${measureRenders.length} measures into ${slices.length} system(s)`);

    return slices;
  }

  private applySystemSlices(document: data.Document, slices: SystemSlice[]): data.Document {
    const clone = document.clone();

    const measures = clone.score.systems.flatMap((s) => s.measures);

    clone.score.systems = [];

    for (const slice of slices) {
      const system: data.System = {
        type: 'system',
        measures: new Array<data.Measure>(),
      };

      system.measures = measures.slice(slice.from, slice.to + 1);

      clone.score.systems.push(system);
    }

    return clone;
  }
}
