import { Measure } from './measure';
import { Notations } from './notations';
import { Note } from './note';
import * as xml from './xml';

describe(Note, () => {
  describe('getStem', () => {
    it.each(['up', 'down', 'double', 'none'])(`returns the stem of the note when valid: '%s'`, (stem) => {
      const node = xml.note({ stem: xml.stem({ textContent: stem }) });
      const note = new Note(node);
      expect(note.getStem()).toBe(stem);
    });

    it('returns null when stem is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getStem()).toBeNull();
    });

    it('returns null when stem is invalid', () => {
      const node = xml.note({ stem: xml.stem({ textContent: 'foo' }) });
      const note = new Note(node);
      expect(note.getStem()).toBeNull();
    });
  });

  describe('getType', () => {
    it.each([
      '1024th',
      '512th',
      '256th',
      '128th',
      '64th',
      '32nd',
      '16th',
      'eighth',
      'quarter',
      'half',
      'whole',
      'breve',
      'long',
      'maxima',
    ])(`returns the note type when valid: '%s'`, (noteType) => {
      const node = xml.note({ type: xml.type({ textContent: noteType }) });
      const note = new Note(node);
      expect(note.getType()).toBe(noteType);
    });

    it(`returns 'whole' when note type is missing`, () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getType()).toBe('whole');
    });

    it(`returns 'whole' when note type is invalid`, () => {
      const node = xml.note({ type: xml.type({ textContent: 'foo' }) });
      const note = new Note(node);
      expect(note.getType()).toBe('whole');
    });
  });

  describe('getDurationDenominator', () => {
    it.each([
      { noteType: '1024th', durationDenominator: '1024' },
      { noteType: '512th', durationDenominator: '512' },
      { noteType: '256th', durationDenominator: '256' },
      { noteType: '128th', durationDenominator: '128' },
      { noteType: '64th', durationDenominator: '64' },
      { noteType: '32nd', durationDenominator: '32' },
      { noteType: '16th', durationDenominator: '16' },
      { noteType: 'eighth', durationDenominator: '8' },
      { noteType: 'quarter', durationDenominator: '4' },
      { noteType: 'half', durationDenominator: '2' },
      { noteType: 'whole', durationDenominator: '1' },
      { noteType: 'breve', durationDenominator: '1/2' },
      { noteType: 'long', durationDenominator: '1/2' },
      { noteType: 'maxima', durationDenominator: '' },
    ])(`translates note types into a duration denominators: '$noteType' to '$durationDenominator'`, (t) => {
      const node = xml.note({ type: xml.type({ textContent: t.noteType }) });
      const note = new Note(node);
      expect(note.getDurationDenominator()).toBe(t.durationDenominator);
    });

    it(`returns '1' for invalid note types`, () => {
      const node = xml.note({ type: xml.type({ textContent: 'foo' }) });
      const note = new Note(node);
      expect(note.getDurationDenominator()).toBe('1');
    });

    it(`returns '1' when note type is missing`, () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getDurationDenominator()).toBe('1');
    });
  });

  describe('getDotCount', () => {
    it('returns the number of dots for the note', () => {
      const node = xml.note({ dots: [xml.dot(), xml.dot()] });
      const note = new Note(node);
      expect(note.getDotCount()).toBe(2);
    });

    it('returns 0 when dots are missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getDotCount()).toBe(0);
    });
  });

  describe('isGrace', () => {
    it('returns true when the note has a grace', () => {
      const node = xml.note({ grace: xml.grace() });
      const note = new Note(node);
      expect(note.isGrace()).toBeTrue();
    });

    it('returns false when the note does not have a grace', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.isGrace()).toBeFalse();
    });
  });

  describe('hasGraceSlash', () => {
    it('returns true when the note has a grace when slash is yes', () => {
      const node = xml.note({ grace: xml.grace({ slash: 'yes' }) });
      const note = new Note(node);
      expect(note.hasGraceSlash()).toBeTrue();
    });

    it('returns false when the note has a grace when slash is no', () => {
      const node = xml.note({ grace: xml.grace({ slash: 'no' }) });
      const note = new Note(node);
      expect(note.hasGraceSlash()).toBeFalse();
    });

    it('returns false when the note has an invalid slash', () => {
      const node = xml.note({ grace: xml.grace({ slash: 'foo' }) });
      const note = new Note(node);
      expect(note.hasGraceSlash()).toBeFalse();
    });

    it('returns false when the note has no grace', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.hasGraceSlash()).toBeFalse();
    });
  });

  describe('getNotations', () => {
    it('returns the notations of the note', () => {
      const notation1 = xml.notations();
      const notation2 = xml.notations();
      const node = xml.note({ notations: [notation1, notation2] });
      const note = new Note(node);
      expect(note.getNotations()).toStrictEqual([new Notations(notation1), new Notations(notation2)]);
    });

    it('returns an empty array when missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getNotations()).toBeEmpty();
    });
  });

  describe('getVoice', () => {
    it('returns the voice of the note', () => {
      const node = xml.note({ voice: xml.voice({ textContent: '2' }) });
      const note = new Note(node);
      expect(note.getVoice()).toBe('2');
    });

    it(`defaults '1' when voice is missing`, () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getVoice()).toBe('1');
    });
  });

  describe('getStaffNumber', () => {
    it('returns the staff number the note belongs to', () => {
      const node = xml.note({ staff: xml.staff({ number: 42 }) });
      const note = new Note(node);
      expect(note.getStaffNumber()).toBe(42);
    });

    it('defaults to 1 when staff number is invalid', () => {
      const node = xml.note({ staff: xml.staff({ number: NaN }) });
      const note = new Note(node);
      expect(note.getStaffNumber()).toBe(1);
    });

    it('defaults to 1 when staff number is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getStaffNumber()).toBe(1);
    });
  });

  describe('getPitch', () => {
    it('returns the pitch of the note', () => {
      const node = xml.note({
        pitch: xml.pitch({
          step: xml.step({ textContent: 'D' }),
          octave: xml.octave({ textContent: '12' }),
        }),
      });
      const note = new Note(node);
      expect(note.getPitch()).toBe('D/12');
    });

    it(`defaults to step 'C' when missing step`, () => {
      const node = xml.note({
        pitch: xml.pitch({
          octave: xml.octave({ textContent: '12' }),
        }),
      });
      const note = new Note(node);
      expect(note.getPitch()).toBe('C/12');
    });

    it(`defaults to octave '4' when missing octave`, () => {
      const node = xml.note({
        pitch: xml.pitch({
          step: xml.step({ textContent: 'D' }),
        }),
      });
      const note = new Note(node);
      expect(note.getPitch()).toBe('D/4');
    });

    it(`defaults to 'C/4' when missing step and octave`, () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getPitch()).toBe('C/4');
    });
  });

  describe('getAccidental', () => {
    it.each([
      'sharp',
      'natural',
      'flat',
      'double-sharp',
      'sharp-sharp',
      'flat-flat',
      'natural-sharp',
      'natural-flat',
      'quarter-flat',
      'quarter-sharp',
      'three-quarters-flat',
      'three-quarters-sharp',
      'sharp-down',
      'sharp-up',
      'natural-down',
      'natural-up',
      'flat-down',
      'flat-up',
      'double-sharp-down',
      'double-sharp-up',
      'flat-flat-down',
      'flat-flat-up',
      'arrow-down',
      'arrow-up',
      'triple-sharp',
      'triple-flat',
      'slash-quarter-sharp',
      'slash-sharp',
      'slash-flat',
      'double-slash-flat',
      'flat-1',
      'flat-2',
      'flat-3',
      'flat-4',
      'sori',
      'koron',
      'other',
    ])(`returns the accidental of the note: '%s'`, (accidental) => {
      const node = xml.note({ accidental: xml.accidental({ value: accidental }) });
      const note = new Note(node);
      expect(note.getAccidental()).toBe(accidental);
    });

    it('defaults to null when accidental is invalid', () => {
      const node = xml.note({ accidental: xml.accidental({ value: 'foo' }) });
      const note = new Note(node);
      expect(note.getAccidental()).toBeNull();
    });

    it('defaults to null when accidental is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getAccidental()).toBeNull();
    });
  });

  describe('hasAccidentalCautionary', () => {
    it('returns if the note has an accidental that is cautionary', () => {
      const node = xml.note({ accidental: xml.accidental({ cautionary: 'yes' }) });
      const note = new Note(node);
      expect(note.hasAccidentalCautionary()).toBeTrue();
    });

    it('returns false when the cautionary value is invalid', () => {
      const node = xml.note({ accidental: xml.accidental({ cautionary: 'foo' }) });
      const note = new Note(node);
      expect(note.hasAccidentalCautionary()).toBeFalse();
    });

    it('returns false when the accidental is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.hasAccidentalCautionary()).toBeFalse();
    });
  });

  describe('getDuration', () => {
    it('returns the duration of the note', () => {
      const node = xml.note({ duration: xml.duration({ positiveDivisions: 2 }) });
      const note = new Note(node);
      expect(note.getDuration()).toBe(2);
    });

    it('returns 4 when duration is invalid', () => {
      const node = xml.note({ duration: xml.duration({ positiveDivisions: NaN }) });
      const note = new Note(node);
      expect(note.getDuration()).toBe(4);
    });

    it('returns 4 when duration is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getDuration()).toBe(4);
    });
  });

  describe('getNotehead', () => {
    it.each([
      'arrow down',
      'arrow up',
      'back slashed',
      'circle dot',
      'circle-x',
      'circled',
      'cluster',
      'cross',
      'diamond',
      'do',
      'fa',
      'fa up',
      'inverted triangle',
      'la',
      'left triangle',
      'mi',
      'none',
      'normal',
      're',
      'rectangle',
      'slash',
      'slashed',
      'so',
      'square',
      'ti',
      'triangle',
      'x',
      'other',
    ])(`returns the notehead of the note: '%s'`, (notehead) => {
      const node = xml.note({ notehead: xml.notehead({ value: notehead }) });
      const note = new Note(node);
      expect(note.getNotehead()).toBe(notehead);
    });

    it(`defaults to 'normal' when the notehead is invalid`, () => {
      const node = xml.note({ notehead: xml.notehead({ value: 'foo' }) });
      const note = new Note(node);
      expect(note.getNotehead()).toBe('normal');
    });

    it(`defaults to 'normal' when the notehead is missing`, () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getNotehead()).toBe('normal');
    });
  });

  describe('isChordHead', () => {
    it('returns true when the next note has a chord element', () => {
      const node = xml.measure({ notes: [xml.note(), xml.note({ chord: xml.chord() })] });
      const measure = new Measure(node);
      const note = measure.getNotes()[0];
      expect(note.isChordHead()).toBeTrue();
    });

    it('returns false when the next note does not have a chord element', () => {
      const node = xml.measure({ notes: [xml.note(), xml.note()] });
      const measure = new Measure(node);
      const note = measure.getNotes()[0];
      expect(note.isChordHead()).toBeFalse();
    });

    it('returns false when the current note has a chord element', () => {
      const node = xml.measure({ notes: [xml.note({ chord: xml.chord() }), xml.note({ chord: xml.chord() })] });
      const measure = new Measure(node);
      const note = measure.getNotes()[0];
      expect(note.isChordHead()).toBeFalse();
    });

    it('returns false when there is no next note', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.isChordHead()).toBeFalse();
    });
  });

  describe('isChordTail', () => {
    it('returns true when the note has a chord element', () => {
      const node = xml.measure({ notes: [xml.note(), xml.note({ chord: xml.chord() })] });
      const measure = new Measure(node);
      const note = measure.getNotes()[1];
      expect(note.isChordTail()).toBeTrue();
    });

    it('returns false when the note does not have a chord element', () => {
      const node = xml.measure({ notes: [xml.note(), xml.note()] });
      const measure = new Measure(node);
      const note = measure.getNotes()[1];
      expect(note.isChordTail()).toBeFalse();
    });
  });

  describe('getChordTail', () => {
    it('returns the chord tail of a note that is a chord head', () => {
      const node = xml.measure({
        notes: [xml.note(), xml.note({ chord: xml.chord() }), xml.note({ chord: xml.chord() })],
      });
      const measure = new Measure(node);
      const [head, ...tail] = measure.getNotes();
      expect(head.getChordTail()).toStrictEqual(tail);
    });

    it('returns an empty array if the note is not a chord head', () => {
      const node = xml.measure({
        notes: [xml.note(), xml.note(), xml.note({ chord: xml.chord() }), xml.note({ chord: xml.chord() })],
      });
      const measure = new Measure(node);
      const note = measure.getNotes()[0];
      expect(note.getChordTail()).toBeEmpty();
    });

    it('returns an empty array if the note is part of a chord tail', () => {
      const node = xml.measure({
        notes: [xml.note(), xml.note({ chord: xml.chord() }), xml.note({ chord: xml.chord() })],
      });
      const measure = new Measure(node);
      const note = measure.getNotes()[1];
      expect(note.getChordTail()).toBeEmpty();
    });

    it('does not include non-chord tail notes before or after the chord', () => {
      const node = xml.measure({
        notes: [xml.note(), xml.note(), xml.note({ chord: xml.chord() }), xml.note({ chord: xml.chord() }), xml.note()],
      });
      const measure = new Measure(node);
      const notes = measure.getNotes();
      expect(notes[1].getChordTail()).toStrictEqual([notes[2], notes[3]]);
    });
  });

  describe('isRest', () => {
    it('returns true when the note has a rest element', () => {
      const node = xml.note({ rest: xml.rest() });
      const note = new Note(node);
      expect(note.isRest()).toBeTrue();
    });

    it('returns false when the note does not have a rest element', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.isRest()).toBeFalse();
    });
  });
});
