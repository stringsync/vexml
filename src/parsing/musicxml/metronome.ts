import * as data from '@/data';
import * as musicxml from '@/musicxml';
import type * as mdom from '@stringsync/mdom';
import { NOTE_TYPES } from '@/musicxml';
import * as conversions from './conversions';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Metronome {
  constructor(
    private config: Config,
    private log: Logger,
    private playbackBpm: number,
    private opts: {
      name?: string;
      parenthesis?: boolean;
      duration?: string;
      dots?: number;
      displayBpm?: number;
      duration2?: string;
      dots2?: number;
    }
  ) {}

  static default(config: Config, log: Logger): Metronome {
    return new Metronome(config, log, config.DEFAULT_PLAYBACK_BPM, {});
  }

  static create(
    config: Config,
    log: Logger,
    musicXML: { metronome: musicxml.Metronome; mark: musicxml.MetronomeMark }
  ): Metronome {
    const parenthesis = musicXML.metronome.parentheses() ?? undefined;
    const duration = conversions.fromNoteTypeToDurationType(musicXML.mark.left.unit) ?? undefined;
    const dots = musicXML.mark.left.dotCount;

    switch (musicXML.mark.right.type) {
      case 'note':
        const duration2 = conversions.fromNoteTypeToDurationType(musicXML.mark.right.unit) ?? undefined;
        const dots2 = musicXML.mark.right.dotCount;
        return new Metronome(config, log, config.DEFAULT_PLAYBACK_BPM, {
          parenthesis,
          duration,
          dots,
          duration2,
          dots2,
        });
      case 'bpm':
        const displayBpm = musicXML.mark.right.bpm;
        return new Metronome(config, log, displayBpm, { parenthesis, duration, dots, displayBpm });
    }
  }

  static fromMdom(config: Config, log: Logger, mdom: { metronome: mdom.MElement }): Metronome | null {
    const mark = Metronome.markFromMdom(mdom.metronome);
    if (!mark) {
      return null;
    }

    const parenthesis = mdom.metronome.getAttribute('parentheses') === 'yes';
    const duration = conversions.fromNoteTypeToDurationType(mark.left.unit) ?? undefined;
    const dots = mark.left.dotCount;

    switch (mark.right.type) {
      case 'note': {
        const duration2 = conversions.fromNoteTypeToDurationType(mark.right.unit) ?? undefined;
        const dots2 = mark.right.dotCount;
        return new Metronome(config, log, config.DEFAULT_PLAYBACK_BPM, {
          parenthesis,
          duration,
          dots,
          duration2,
          dots2,
        });
      }
      case 'bpm': {
        const displayBpm = mark.right.bpm;
        return new Metronome(config, log, displayBpm, { parenthesis, duration, dots, displayBpm });
      }
    }
  }

  /** Reconstructs a {@link musicxml.MetronomeMark} from a raw mdom `<metronome>` element. */
  private static markFromMdom(metronome: mdom.MElement): musicxml.MetronomeMark | null {
    const left = new Array<mdom.MElement>();
    const right = new Array<mdom.MElement>();

    for (const child of metronome.children) {
      const element = child as mdom.MElement;
      if (element.tag === 'beat-unit') {
        (left.length > 0 ? right : left).push(element);
      } else if (element.tag === 'beat-unit-dot') {
        (right.length > 0 ? right : left).push(element);
      } else if (element.tag === 'per-minute') {
        right.push(element);
      }
    }

    const isWellFormedNote = (elements: mdom.MElement[]): boolean =>
      elements.length > 0 &&
      elements[0].tag === 'beat-unit' &&
      elements.slice(1).every((child) => child.tag === 'beat-unit-dot');
    const isWellFormedBpm = (elements: mdom.MElement[]): boolean =>
      elements.length === 1 && elements[0].tag === 'per-minute';

    if (!isWellFormedNote(left)) {
      return null;
    }
    const rightType = isWellFormedNote(right) ? 'note' : isWellFormedBpm(right) ? 'bpm' : 'invalid';
    if (rightType === 'invalid') {
      return null;
    }

    const noteOperand = (elements: mdom.MElement[]) => {
      const rawUnit = elements[0].text;
      const unit: musicxml.NoteType = rawUnit && NOTE_TYPES.includes(rawUnit) ? rawUnit : 'quarter';
      const dotCount = elements.slice(1).filter((child) => child.tag === 'beat-unit-dot').length;
      return { type: 'note' as const, unit, dotCount };
    };
    const bpmOperand = (elements: mdom.MElement[]) => {
      const bpm = elements[0].text != null ? parseInt(elements[0].text, 10) : NaN;
      return { type: 'bpm' as const, bpm: Number.isNaN(bpm) ? 120 : bpm };
    };

    return { left: noteOperand(left), right: rightType === 'note' ? noteOperand(right) : bpmOperand(right) };
  }

  parse(): data.Metronome {
    return {
      type: 'metronome',
      playbackBpm: this.playbackBpm,
      ...this.opts,
    };
  }

  isEqual(metronome: Metronome): boolean {
    return (
      this.opts.name === metronome.opts.name &&
      this.opts.parenthesis === metronome.opts.parenthesis &&
      this.opts.duration === metronome.opts.duration &&
      this.opts.dots === metronome.opts.dots &&
      this.opts.displayBpm === metronome.opts.displayBpm &&
      this.opts.duration2 === metronome.opts.duration2 &&
      this.opts.dots2 === metronome.opts.dots2
    );
  }
}
