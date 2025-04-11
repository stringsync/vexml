import * as rendering from '@/rendering';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Fraction } from '@/util';
import { Pitch } from './types';

export class Note {
  private constructor(
    private config: Config,
    private log: Logger,
    private document: rendering.Document,
    private noteRender: rendering.NoteRender
  ) {}

  static create(config: Config, log: Logger, document: rendering.Document, noteRender: rendering.NoteRender): Note {
    return new Note(config, log, document, noteRender);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'note';

  /** Returns the bounding box of the element. */
  rect(): Rect {
    return this.noteRender.rect;
  }

  /** Returns the subtype of the note. */
  getSubtype(): 'note' | 'chord' {
    return this.noteRender.subtype;
  }

  /** Returns the pitches of the note. */
  getPitches(): Pitch[] {
    switch (this.getSubtype()) {
      case 'note':
        return this.getNotePitches();
      case 'chord':
        return this.getChordPitches();
    }
  }

  /** Returns whether the note contains an equivalent pitch to another note. */
  containsEquivalentPitch(otherNote: Note): boolean {
    // Let N be the number of pitches a note has. This algorithm has a time complexity of O(N^2), but N should always
    // be small (<10).
    return this.getPitches().some((pitch) =>
      otherNote.getPitches().some((otherPitch) => this.isPitchEqivalent(pitch, otherPitch))
    );
  }

  /** Returns whether the note is connected to another note via a curve (tie or slur). */
  sharesACurveWith(otherNote: Note): boolean {
    return this.noteRender.curveIds.some((curveId) => otherNote.noteRender.curveIds.includes(curveId));
  }

  /** Returns the measure beat that this note starts on. */
  getStartMeasureBeat(): Fraction {
    return Fraction.fromFractionLike(this.document.getVoiceEntry(this.noteRender.key).measureBeat);
  }

  /** Returns the number of beats that this note takes. */
  getBeatCount(): Fraction {
    return Fraction.fromFractionLike(this.document.getVoiceEntry(this.noteRender.key).duration);
  }

  /** Returns the system index that this note resides in. */
  getSystemIndex(): number {
    return this.noteRender.key.systemIndex;
  }

  /** Returns the absolute measure index that this note resides in. */
  getAbsoluteMeasureIndex(): number {
    return this.document.getAbsoluteMeasureIndex(this.noteRender.key);
  }

  private getNotePitches(): Pitch[] {
    const note = this.document.getNote(this.noteRender.key);
    return [
      {
        step: note.pitch.step,
        octave: note.pitch.octave,
        accidentalCode: note.accidental?.code ?? null,
      },
    ];
  }

  private getChordPitches(): Pitch[] {
    const chord = this.document.getChord(this.noteRender.key);
    return chord.notes.map((note) => ({
      step: note.pitch.step,
      octave: note.pitch.octave,
      accidentalCode: note.accidental?.code ?? null,
    }));
  }

  private isPitchEqivalent(a: Pitch, b: Pitch): boolean {
    return a.step === b.step && a.octave === b.octave && a.accidentalCode === b.accidentalCode;
  }
}
