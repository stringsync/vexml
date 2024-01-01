import { NamedElement } from '../util';
import { NOTE_TYPES, NoteType } from './enums';

/**
 * Represents metronome marks and other metric relationships.
 *
 * Only supports simple meters in the form of [beat-unit symbol] = [bpm].
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/metronome/.
 */
export class Metronome {
  constructor(private element: NamedElement<'metronome'>) {}

  /** Returns the first beat unit. Defaults to 'quarter'. */
  getBeatUnit(): NoteType {
    return this.element.first('beat-unit')?.content().enum(NOTE_TYPES) ?? 'quarter';
  }

  /**
   * Returns how many dots are applied to the beat unit, which are only the ones right after the <beat-unit>.
   *
   * Defaults to 0.
   */
  getBeatUnitDotCount(): number {
    let count = 0;

    for (const child of this.element.children()) {
      if (child.isNamed('beat-unit')) {
        continue;
      } else if (child.isNamed('beat-unit-dot')) {
        count++;
      } else {
        // The other <beat-unit-dots> do not apply to the beat-unit.
        break;
      }
    }

    return count;
  }

  /**
   * Returns the beats per minute.
   *
   * Only supports integer values. Defaults to null.
   */
  getBeatsPerMinute(): number | null {
    return this.element.first('per-minute')?.content().int() ?? null;
  }
}
