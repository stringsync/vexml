import * as util from '@/util';
import * as elements from '@/elements';
import * as data from '@/data';
import { Document } from './document';
import { Formatter } from './types';
import { Config } from './config';
import { Logger } from '@/debug';

export class UndefinedHeightFormatter implements Formatter {
  private w: number;
  private y = 0;

  constructor(private config: Config, private log: Logger, private elements: { score: elements.Score }) {
    util.assertNotNull(this.config.WIDTH);
    this.w = this.config.WIDTH;
  }

  format(): Document {
    this.y = this.config.TOP_PADDING;

    const document = new data.Document(this.formatScore(this.elements.score));
    return new Document(document);
  }

  private formatScore(score: elements.Score): data.Score {
    const result: data.Score = {
      type: 'score',
      title: null,
      partLabels: [],
      systems: [],
    };

    const title = score.getTitle();

    result.title = this.formatTitle(title, this.y);
    // TODO: This probably needs to be positioned, especially for paged formatting.
    result.partLabels = score.getPartLabels();
    result.systems = this.formatSystems(score);

    return result;
  }

  private formatTitle(title: elements.Title | null, y: number): data.Title | null {
    if (!title) {
      return null;
    }

    const result: data.Title = {
      type: 'title',
      text: '',
    };

    result.text = title.getText();

    const rect = title.getRect();

    this.y += rect.h;
    this.y += this.config.TITLE_BOTTOM_PADDING;

    return result;
  }

  private formatSystems(score: elements.Score): data.System[] {
    const measures = score.getSystems().flatMap((system) => system.getMeasures());
    this.log.debug('formatting measures', { length: measures.length, width: this.w });

    const systems = new Array<data.System>(); // systems

    let remaining = this.w;
    let buffer = new Array<elements.Measure>();
    let index = 0;
    while (index < measures.length) {
      const measure = measures[index];
      const rect = measure.getRect();

      if (rect.w > remaining) {
        const system = this.formatSystem(buffer);
        systems.push(system);
        buffer = [];
        remaining = this.w;
      }

      buffer.push(measure);
      remaining -= rect.w;

      if (index === measures.length - 1) {
        const system = this.formatSystem(buffer);
        systems.push(system);
      }

      index++;
    }

    return systems;
  }

  private formatSystem(measures: elements.Measure[]): data.System {
    const result: data.System = {
      type: 'system',
      measures: [],
    };

    let x = 0;
    for (const measure of measures) {
      const formatted = this.formatMeasure(measure, x);
      result.measures.push(formatted);
      const w = util.sum(formatted.entries.map((e) => e.width ?? 0));
      x += w;
    }

    const h = util.max(
      measures.map((m) => m.getRect().h),
      0
    );

    this.y += h;

    return result;
  }

  private formatMeasure(measure: elements.Measure, x: number): data.Measure {
    const result: data.Measure = {
      type: 'measure',
      label: '',
      entries: [],
    };

    result.label = measure.getLabel();

    result.entries = measure.getEntries().flatMap((entry) => {
      if (entry instanceof elements.Fragment) {
        return this.formatFragment(entry, x);
      }

      if (entry instanceof elements.Gap) {
        return this.formatGap(entry, x);
      }

      this.log.warn('unhandled measure entry, skipping', { entry });
      return [];
    });

    return result;
  }

  private formatFragment(fragment: elements.Fragment, x: number): data.Fragment {
    const result: data.Fragment = {
      type: 'fragment',
      signature: {
        type: 'fragmentsignature',
        // TODO: Use a real one
        metronome: {
          type: 'metronome',
          bpm: 120,
        },
      },
      parts: [],
      width: 0,
    };

    result.parts = fragment.getParts().map((part) => this.formatPart(part, x));
    result.width = 100;

    return result;
  }

  private formatPart(part: elements.Part, x: number): data.Part {
    const result: data.Part = {
      type: 'part',
      signature: {
        type: 'partsignature',
        staveCount: 1,
      },
      staves: [],
    };

    result.staves = part.getStaves().map((stave) => this.formatStave(stave, x));

    return result;
  }

  private formatStave(stave: elements.Stave, x: number): data.Stave {
    const result: data.Stave = {
      type: 'stave',
      signature: {
        type: 'stavesignature',
        lineCount: 5,
        clef: {
          type: 'clef',
          sign: 'G',
          line: null,
          octaveChange: null,
        },
        key: {
          type: 'key',
          previousKey: null,
          fifths: 0,
          mode: 'none',
        },
        time: {
          type: 'time',
          components: [
            {
              type: 'fraction',
              numerator: 4,
              denominator: 4,
            },
          ],
        },
      },
      voices: [],
    };

    result.voices = stave.getVoices().map((voice) => this.formatVoice(voice));

    return result;
  }

  private formatVoice(voice: elements.Voice): data.Voice {
    const result: data.Voice = {
      type: 'voice',
      entries: [],
    };

    // result.entries = voice.getEntries().flatMap((entry) => {
    //   if (entry instanceof elements.Note) {
    //     return this.formatNote(entry);
    //   }
    //   this.log.warn('unhandled voice entry, skipping', { entry });
    //   return [];
    // });

    return result;
  }

  private formatNote(note: elements.Note): data.Note {
    const result: data.Note = {
      type: 'note',
      pitch: 'C',
      dotCount: 0,
      octave: 0,
      head: '',
      stemDirection: 'none',
      duration: {
        type: 'fraction',
        numerator: 1,
        denominator: 4,
      },
      measureBeat: {
        type: 'fraction',
        numerator: 0,
        denominator: 1,
      },
    };

    return result;
  }

  private formatGap(gap: elements.Gap, x: number): data.Gap {
    const result: data.Gap = {
      type: 'gap',
      text: null,
      durationMs: 0,
      width: 0,
    };

    return result;
  }
}

export class UndefinedWidthFormatter implements Formatter {
  format(): Document {
    throw new Error('Method not implemented.');
  }
}

export class PagedFormatter implements Formatter {
  format(): Document {
    throw new Error('Method not implemented.');
  }
}
