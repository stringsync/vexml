import { Beam } from './beam';
import { AccidentalType, ACCIDENTAL_TYPES, Notehead, NOTEHEADS, NoteType, NOTE_TYPES, Stem, STEMS } from './enums';
import { NamedElement } from '@/util';
import { Notations } from './notations';
import { Lyric } from './lyric';
import { TimeModification } from './timemodification';

/**
 * Contains graphical and musical information about a note.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/
 */
export class Note {
  constructor(private element: NamedElement<'note'>) {}

  /** Returns the stem of the note or null when missing or invalid. */
  getStem(): Stem | null {
    return this.element.first('stem')?.content().enum(STEMS) ?? null;
  }

  /** Returns the type of note or null when missing or invalid. */
  getType(): NoteType | null {
    return this.element.first('type')?.content().enum(NOTE_TYPES) ?? null;
  }

  /** Returns the duration of the note. Defaults to 4 */
  getDuration(): number {
    return this.element.first('duration')?.content().int() ?? 4;
  }

  /** Returns how many dots are on the note. */
  getDotCount(): number {
    return this.element.all('dot').length;
  }

  /** Returns the lyrics associated with the note. */
  getLyrics(): Lyric[] {
    return this.element.all('lyric').map((element) => new Lyric(element));
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

  /** Returns the stave the note belongs to. */
  getStaveNumber(): number {
    return this.element.first('staff')?.content().int() ?? 1;
  }

  /** Returns the step of the note. Defaults to 'C'. */
  getStep(): string {
    return this.element.first('step')?.content().str() ?? 'C';
  }

  /** Returns the octave of the note. Defaults to 4. */
  getOctave(): number {
    return this.element.first('octave')?.content().int() ?? 4;
  }

  /**
   * Returns the step and octave of the rest in the format `${step}/${octave}`.
   *
   * Defaults to null. This is intended to only be used for notes that contain a <rest> element.
   */
  getRestDisplayPitch(): string | null {
    const step = this.getRestDisplayStep();
    const octave = this.getRestDisplayOctave();
    return typeof step === 'string' && typeof octave === 'number' ? `${step}/${octave}` : null;
  }

  getRestDisplayStep(): string | null {
    return this.element.first('display-step')?.content().str() ?? null;
  }

  getRestDisplayOctave(): number | null {
    return this.element.first('display-octave')?.content().int() ?? null;
  }

  /** Returns the accidental type of the note. Defaults to null. */
  getAccidentalType(): AccidentalType | null {
    return this.element.first('accidental')?.content().enum(ACCIDENTAL_TYPES) ?? null;
  }

  /** Returns the alteration of the note. Defaults to null. */
  getAlter(): number | null {
    return this.element.first('alter')?.content().float() ?? null;
  }

  /** Whether or not the accidental is cautionary. Defaults to false. */
  hasAccidentalCautionary(): boolean {
    return this.element.first('accidental')?.attr('cautionary').str() === 'yes';
  }

  /** Returns the notehead of the note. */
  getNotehead(): Notehead | null {
    return this.element.first('notehead')?.content().enum(NOTEHEADS) ?? null;
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

  /** Returns the beams of the note. */
  getBeams(): Beam[] {
    return this.element.all('beam').map((element) => new Beam(element));
  }

  /** Returns the time modification of the note. Defaults to null. */
  getTimeModification(): TimeModification | null {
    const element = this.element.first('time-modification');
    return element ? new TimeModification(element) : null;
  }

  /** Whether to print the object. Defaults to true. */
  printObject(): boolean {
    return this.element.attr('print-object').withDefault('yes').str() !== 'no';
  }
}
