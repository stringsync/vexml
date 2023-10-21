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

  /** Returns how many dots are applied to the beat unit. Defaults to 0. */
  getDotCount(): number {
    return this.element.children('beat-unit-dot').length;
  }

  /**
   * Returns the beats per minute.
   *
   * Only supports integer values. Defaults to 120.
   */
  getBeatsPerMinute(): number {
    return this.element.first('per-minute')?.content().withDefault(120).int() ?? 120;
  }
}
