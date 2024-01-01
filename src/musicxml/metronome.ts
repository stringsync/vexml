import { NamedElement } from '../util';
import { NOTE_TYPES, NoteType } from './enums';

/** The details of a metronome mark. */
export type MetronomeMark = {
  left: NoteMetronomeOperand;
  right: NoteMetronomeOperand | BpmMetronomeOperand;
};

type NoteMetronomeOperand = {
  type: 'note';
  unit: NoteType;
  dotCount: number;
};

type BpmMetronomeOperand = {
  type: 'bpm';
  bpm: number;
};

/**
 * Represents metronome marks and other metric relationships.
 *
 * Only supports simple meters in the form of [beat-unit symbol] = [bpm].
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/metronome/.
 */
export class Metronome {
  constructor(private element: NamedElement<'metronome'>) {}

  /** Returns whether the metronome mark is in parentheses. */
  parentheses(): boolean {
    return this.element.attr('parentheses').withDefault('no').str() === 'yes';
  }

  /** Returns the metronome mark details. Defaults to a quarter note = 120 bpm. */
  getMark(): MetronomeMark | null {
    const leftElements = new Array<NamedElement<'beat-unit' | 'beat-unit-dot'>>();
    const rightElements = new Array<NamedElement<'beat-unit' | 'beat-unit-dot' | 'per-minute'>>();

    for (const child of this.element.children()) {
      const hasLeftElements = leftElements.length > 0;
      const hasRightElements = rightElements.length > 0;

      if (child.isNamed('beat-unit')) {
        if (hasLeftElements) {
          rightElements.push(child);
        } else {
          leftElements.push(child);
        }
      }

      if (child.isNamed('beat-unit-dot')) {
        if (hasRightElements) {
          rightElements.push(child);
        } else {
          leftElements.push(child);
        }
      }

      if (child.isNamed('per-minute')) {
        rightElements.push(child);
      }
    }

    if (!this.isWellFormedNote(leftElements)) {
      return null;
    }

    const rightOperandType = this.isWellFormedNote(rightElements)
      ? 'note'
      : this.isWellFormedBpm(rightElements)
      ? 'bpm'
      : 'invalid';

    if (rightOperandType === 'invalid') {
      return null;
    }

    return {
      left: this.noteOperand(leftElements),
      right: rightOperandType === 'note' ? this.noteOperand(rightElements) : this.bpmOperand(rightElements),
    };
  }

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

  private noteOperand(elements: NamedElement<string>[]): NoteMetronomeOperand {
    const unit = elements[0].content().enum(NOTE_TYPES) ?? 'quarter';
    const dotCount = elements.slice(1).filter((child) => child.isNamed('beat-unit-dot')).length;
    return { type: 'note', unit, dotCount };
  }

  private bpmOperand(elements: NamedElement<string>[]): BpmMetronomeOperand {
    const bpm = elements[0].content().int() ?? 120;
    return { type: 'bpm', bpm };
  }

  private isWellFormedNote(elements: NamedElement<string>[]): boolean {
    if (elements.length === 0) {
      return false;
    }
    if (!elements[0].isNamed('beat-unit')) {
      return false;
    }
    if (elements.slice(1).some((child) => !child.isNamed('beat-unit-dot'))) {
      return false;
    }
    return true;
  }

  private isWellFormedBpm(elements: NamedElement<string>[]): boolean {
    if (elements.length > 1) {
      return false;
    }
    if (!elements[0].isNamed('per-minute')) {
      return false;
    }
    return true;
  }
}
