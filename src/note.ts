import {
  AccidentalCode,
  AccidentalType,
  ACCIDENTAL_TYPES,
  NoteDurationDenominator,
  Notehead,
  NOTEHEADS,
  NoteheadSuffix,
  NoteType,
  NOTE_TYPES,
  Stem,
  STEMS,
} from './enums';
import { NamedElement } from './namedelement';
import { Notations } from './notations';

export class Note {
  constructor(private element: NamedElement<'note'>) {}

  /** Returns the stem of the note or null when missing or invalid. */
  getStem(): Stem | null {
    return this.element.first('stem')?.content().enum(STEMS) ?? null;
  }

  /** Returns the type of note or 'whole' when missing or invalid. */
  getType(): NoteType {
    return this.element.first('type')?.content().enum(NOTE_TYPES) ?? 'whole';
  }

  /** Returns the duration of the note. Defaults to 4 */
  getDuration(): number {
    return this.element.first('duration')?.content().int() ?? 4;
  }

  /** Translates the note type to the duration denominator of the note. */
  getDurationDenominator(): NoteDurationDenominator {
    switch (this.getType()) {
      case '1024th':
        return '1024';
      case '512th':
        return '512';
      case '256th':
        return '256';
      case '128th':
        return '128';
      case '64th':
        return '64';
      case '32nd':
        return '32';
      case '16th':
        return '16';
      case 'eighth':
        return '8';
      case 'quarter':
        return '4';
      case 'half':
        return '2';
      case 'whole':
        return '1';
      case 'breve':
        return '1/2';
      case 'long':
        // VexFlow bug: should be '1/4' but it is not supported
        // return '1/4';
        return '1/2';
      default:
        return '';
    }
  }

  /** Returns how many dots are on the note. */
  getDotCount(): number {
    return this.element.all('dot').length;
  }

  /** Whether or not the note is a grace note. */
  isGrace(): boolean {
    return this.element.all('grace').length > 0;
  }

  /** Whether or not the note has a glash slash. */
  hasGraceSlash(): boolean {
    return this.element.first('grace')?.attr('slash').str() === 'yes';
  }

  /** Returns the notations of the note. */
  getNotations(): Notations[] {
    return this.element.all('notations').map((element) => new Notations(element));
  }

  /** Returns the voice this note belongs to. */
  getVoice(): string {
    return this.element.first('voice')?.content().str() ?? '1';
  }

  /** Returns the staff the note belongs to. */
  getStaffNumber(): number {
    return this.element.first('staff')?.content().int() ?? 1;
  }

  /** Returns the step and octave of the note in the format `${step}/${octave}`. */
  getPitch(): string {
    const step = this.element.first('step')?.content().str() ?? 'C';
    const octave = this.element.first('octave')?.content().str() ?? '4';
    return `${step}/${octave}`;
  }

  /** Returns the accidental type of the note. Defaults to null. */
  getAccidentalType(): AccidentalType | null {
    return this.element.first('accidental')?.content().enum(ACCIDENTAL_TYPES) ?? null;
  }

  /** Returns the accidental code of the note. Defaults to null. */
  getAccidentalCode(): AccidentalCode | null {
    switch (this.getAccidentalType()) {
      case 'sharp':
        return '#';
      case 'double-sharp':
        return '##';
      case 'natural':
        return 'n';
      case 'flat':
        return 'b';
      case 'flat-flat':
        return 'bb';
      default:
        return null;
    }
  }

  /** Whether or not the accidental is cautionary. Defaults to false. */
  hasAccidentalCautionary(): boolean {
    return this.element.first('accidental')?.attr('cautionary').str() === 'yes';
  }

  /** Returns the notehead of the note. */
  getNotehead(): Notehead {
    return this.element.first('notehead')?.content().enum(NOTEHEADS) ?? 'normal';
  }

  /** Returns the notehead suffix of the note. Defaults to ''. */
  getNoteheadSuffix(): NoteheadSuffix {
    switch (this.getNotehead()) {
      case 'circle dot':
      case 'cluster':
      case 'cross':
      case 'inverted triangle':
      case 'left triangle':
      case 'slashed':
        return '';
      case 'arrow down':
        return 'TD';
      case 'arrow up':
        return 'TU';
      case 'back slashed':
        return 'SB';
      case 'circled':
        return 'CI';
      case 'diamond':
        return 'D';
      case 'do':
        return 'DO';
      case 'fa':
        return 'FA';
      case 'fa up':
        return 'FAUP';
      case 'mi':
        return 'MI';
      case 'normal':
        return 'N';
      case 'slash':
        return 'S';
      case 'so':
        return 'SO';
      case 'ti':
        return 'TI';
      case 'triangle':
        return 'TU';
      case 'x':
        return 'X';
      default:
        return '';
    }
  }

  /** Whether or not the note is the first note of a chord. */
  isChordHead(): boolean {
    if (this.isChordTail()) {
      return false;
    }

    const sibling = this.element.next('note');
    if (!sibling) {
      return false;
    }

    // The next note has to be part of a chord tail, otherwise there would only one note in the chord.
    return new Note(sibling).isChordTail();
  }

  /** Whether or not the note is part of a chord and *not* the first note of the chord. */
  isChordTail(): boolean {
    return this.element.all('chord').length > 0;
  }

  /** Returns the rest of the notes in the chord iff the current note is a chord head. Defaults to an empty array. */
  getChordTail(): Note[] {
    const tail = new Array<Note>();

    if (!this.isChordHead()) {
      return tail;
    }

    let sibling = this.element.next('note');
    while (sibling) {
      const note = new Note(sibling);
      if (!note.isChordTail()) {
        break;
      }
      tail.push(note);
      sibling = sibling.next('note');
    }

    return tail;
  }

  /** Returns whether or not the note is a rest. */
  isRest(): boolean {
    return this.element.all('rest').length > 0;
  }
}
