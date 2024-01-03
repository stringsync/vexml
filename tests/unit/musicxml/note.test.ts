import { xml } from '@/util';
import { ACCIDENTAL_TYPES, Beam, Lyric, NOTEHEADS, NOTE_TYPES, Notations, Note, TimeModification } from '@/musicxml';

describe(Note, () => {
  describe('getStem', () => {
    it.each(['up', 'down', 'double', 'none'])(`returns the stem of the note when valid: '%s'`, (stem) => {
      const node = xml.note({ stem: xml.stem({ value: stem }) });
      const note = new Note(node);
      expect(note.getStem()).toBe(stem);
    });

    it('returns null when stem is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getStem()).toBeNull();
    });

    it('returns null when stem is invalid', () => {
      const node = xml.note({ stem: xml.stem({ value: 'foo' }) });
      const note = new Note(node);
      expect(note.getStem()).toBeNull();
    });
  });

  describe('getType', () => {
    it.each(NOTE_TYPES.values)(`returns the note type when valid: '%s'`, (noteType) => {
      const node = xml.note({ type: xml.type({ textContent: noteType }) });
      const note = new Note(node);
      expect(note.getType()).toBe(noteType);
    });

    it('returns null when note type is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getType()).toBeNull();
    });

    it('returns null when note type is invalid', () => {
      const node = xml.note({ type: xml.type({ textContent: 'foo' }) });
      const note = new Note(node);
      expect(note.getType()).toBeNull();
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

  describe('getPrecedingGraceNotes', () => {
    it('returns a single preceding grace note', () => {
      const note1 = xml.note({ grace: xml.grace() });
      const note2 = xml.note();
      xml.measure({ notes: [note1, note2] });

      const note = new Note(note2);

      expect(note.getPrecedingGraceNotes()).toStrictEqual([new Note(note1)]);
    });

    it('returns multiple preceding grace notes', () => {
      const note1 = xml.note({ grace: xml.grace() });
      const note2 = xml.note({ grace: xml.grace() });
      const note3 = xml.note();
      xml.measure({ notes: [note1, note2, note3] });

      const note = new Note(note3);

      expect(note.getPrecedingGraceNotes()).toStrictEqual([new Note(note1), new Note(note2)]);
    });

    it('returns an empty array when the note is a grace note', () => {
      const note1 = xml.note({ grace: xml.grace() });
      const note2 = xml.note({ grace: xml.grace() });
      const note3 = xml.note();
      xml.measure({ notes: [note1, note2, note3] });

      const note = new Note(note2);

      expect(note.getPrecedingGraceNotes()).toBeEmpty();
    });

    it('returns an empty array when the note is not a grace note', () => {
      const note1 = xml.note({ grace: xml.grace() });
      const note2 = xml.note();
      const note3 = xml.note();
      xml.measure({ notes: [note1, note2, note3] });

      const note = new Note(note3);

      expect(note.getPrecedingGraceNotes()).toBeEmpty();
    });

    it('returns an empty array when there are no preceding grace notes', () => {
      const note1 = xml.note();
      const note2 = xml.note();
      xml.measure({ notes: [note1, note2] });

      const note = new Note(note2);

      expect(note.getPrecedingGraceNotes()).toBeEmpty();
    });

    it('does not return grace notes from other measures', () => {
      const note1 = xml.note();
      const note2 = xml.note({ grace: xml.grace() });
      const note3 = xml.note();

      const measure1 = xml.measure({ notes: [note1, note2] });
      const measure2 = xml.measure({ notes: [note3] });

      xml.part({ measures: [measure1, measure2] });

      const note = new Note(note3);

      expect(note.getPrecedingGraceNotes()).toBeEmpty();
    });
  });

  describe('getSucceedingGraceNotes', () => {
    it('returns a single succeeding grace note', () => {
      const note1 = xml.note();
      const note2 = xml.note({ grace: xml.grace() });
      xml.measure({ notes: [note1, note2] });

      const note = new Note(note1);

      expect(note.getSucceedingGraceNotes()).toStrictEqual([new Note(note2)]);
    });

    it('returns multiple succeeding grace notes', () => {
      const note1 = xml.note();
      const note2 = xml.note({ grace: xml.grace() });
      const note3 = xml.note({ grace: xml.grace() });
      xml.measure({ notes: [note1, note2, note3] });

      const note = new Note(note1);

      expect(note.getSucceedingGraceNotes()).toStrictEqual([new Note(note2), new Note(note3)]);
    });

    it('returns an empty array when the succeeding note is not a grace note', () => {
      const note1 = xml.note();
      const note2 = xml.note();
      xml.measure({ notes: [note1, note2] });

      const note = new Note(note1);

      expect(note.getSucceedingGraceNotes()).toBeEmpty();
    });

    it('returns an empty array when the note is a grace note', () => {
      const note1 = xml.note();
      const note2 = xml.note({ grace: xml.grace() });
      const note3 = xml.note({ grace: xml.grace() });
      xml.measure({ notes: [note1, note2, note3] });

      const note = new Note(note2);

      expect(note.getSucceedingGraceNotes()).toBeEmpty();
    });

    it('returns an empty array when there are non-grace notes after the note', () => {
      const note1 = xml.note();
      const note2 = xml.note({ grace: xml.grace() });
      const note3 = xml.note();
      xml.measure({ notes: [note1, note2, note3] });

      const note = new Note(note1);

      expect(note.getSucceedingGraceNotes()).toBeEmpty();
    });

    it('does not return grace notes from other measures', () => {
      const note1 = xml.note();
      const note2 = xml.note({ grace: xml.grace() });
      const note3 = xml.note();

      const measure1 = xml.measure({ notes: [note1] });
      const measure2 = xml.measure({ notes: [note2, note3] });

      xml.part({ measures: [measure1, measure2] });

      const note = new Note(note3);

      expect(note.getSucceedingGraceNotes()).toBeEmpty();
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
      const node = xml.note({ voice: xml.voice({ value: '2' }) });
      const note = new Note(node);
      expect(note.getVoice()).toBe('2');
    });

    it(`defaults '1' when voice is missing`, () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getVoice()).toBe('1');
    });
  });

  describe('getStaveNumber', () => {
    it('returns the stave number the note belongs to', () => {
      const node = xml.note({ staff: xml.staff({ number: 42 }) });
      const note = new Note(node);
      expect(note.getStaveNumber()).toBe(42);
    });

    it('defaults to 1 when stave number is invalid', () => {
      const node = xml.note({ staff: xml.staff({ number: NaN }) });
      const note = new Note(node);
      expect(note.getStaveNumber()).toBe(1);
    });

    it('defaults to 1 when stave number is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getStaveNumber()).toBe(1);
    });
  });

  describe('getStep', () => {
    it('returns the step of the note', () => {
      const node = xml.note({
        pitch: xml.pitch({
          step: xml.step({ value: 'D' }),
        }),
      });
      const note = new Note(node);
      expect(note.getStep()).toBe('D');
    });

    it(`defaults to 'C' when missing`, () => {
      const node = xml.note({
        pitch: xml.pitch(),
      });
      const note = new Note(node);
      expect(note.getStep()).toBe('C');
    });
  });

  describe('getOctave', () => {
    it('returns the octave of the note', () => {
      const node = xml.note({
        pitch: xml.pitch({
          octave: xml.octave({ value: 7 }),
        }),
      });
      const note = new Note(node);
      expect(note.getOctave()).toBe(7);
    });

    it('defaults to 4 when missing', () => {
      const node = xml.note({
        pitch: xml.pitch(),
      });
      const note = new Note(node);
      expect(note.getOctave()).toBe(4);
    });

    it('defaults to 4 when invalid', () => {
      const node = xml.note({
        pitch: xml.pitch({
          octave: xml.octave({ value: NaN }),
        }),
      });
      const note = new Note(node);
      expect(note.getOctave()).toBe(4);
    });
  });

  describe('getRestDisplayPitch', () => {
    it('returns the display pitch of the rest', () => {
      const node = xml.note({
        rest: xml.rest({
          displayStep: xml.displayStep({ step: 'D' }),
          displayOctave: xml.displayOctave({ octave: '12' }),
        }),
      });
      const note = new Note(node);
      expect(note.getRestDisplayPitch()).toBe('D/12');
    });

    it('defaults to null when missing display step', () => {
      const node = xml.note({
        rest: xml.rest({
          displayOctave: xml.displayOctave({ octave: '12' }),
        }),
      });
      const note = new Note(node);
      expect(note.getRestDisplayPitch()).toBeNull();
    });

    it('defaults to null when missing display octave', () => {
      const node = xml.note({
        rest: xml.rest({
          displayStep: xml.displayStep({ step: 'D' }),
        }),
      });
      const note = new Note(node);
      expect(note.getRestDisplayPitch()).toBeNull();
    });

    it('defaults to null when missing display step and display octave', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getRestDisplayPitch()).toBeNull();
    });

    it('is independent of the note pitch', () => {
      const node = xml.note({
        pitch: xml.pitch({
          step: xml.step({ value: 'C' }),
          octave: xml.octave({ value: 4 }),
        }),
        rest: xml.rest({
          displayStep: xml.displayStep({ step: 'D' }),
          displayOctave: xml.displayOctave({ octave: '12' }),
        }),
      });
      const note = new Note(node);
      expect(note.getRestDisplayPitch()).toBe('D/12');
    });
  });

  describe('getAccidentalType', () => {
    it.each(ACCIDENTAL_TYPES.values)(`returns the accidental type of the note: '%s'`, (accidental) => {
      const node = xml.note({ accidental: xml.accidental({ value: accidental }) });
      const note = new Note(node);
      expect(note.getAccidentalType()).toBe(accidental);
    });

    it('defaults to null when accidental is invalid', () => {
      const node = xml.note({ accidental: xml.accidental({ value: 'foo' }) });
      const note = new Note(node);
      expect(note.getAccidentalType()).toBeNull();
    });

    it('defaults to null when accidental is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getAccidentalType()).toBeNull();
    });
  });

  describe('getAlter', () => {
    it('returns the alter of the note', () => {
      const node = xml.note({
        pitch: xml.pitch({
          alter: xml.alter({ value: 1.5 }),
        }),
      });

      const note = new Note(node);

      expect(note.getAlter()).toBe(1.5);
    });

    it('defaults to null when the alter is missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getAlter()).toBeNull();
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
    it.each(NOTEHEADS.values)(`returns the notehead of the note: '%s'`, (notehead) => {
      const node = xml.note({ notehead: xml.notehead({ value: notehead }) });
      const note = new Note(node);
      expect(note.getNotehead()).toBe(notehead);
    });

    it(`defaults to null when the notehead is invalid`, () => {
      const node = xml.note({ notehead: xml.notehead({ value: 'foo' }) });
      const note = new Note(node);
      expect(note.getNotehead()).toBeNull();
    });

    it(`defaults to null when the notehead is missing`, () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getNotehead()).toBeNull();
    });
  });

  describe('isChordHead', () => {
    it('returns true when the next note has a chord element', () => {
      const note1 = xml.note();
      const note2 = xml.note({ chord: xml.chord() });

      xml.measure({ notes: [note1, note2] });

      expect(new Note(note1).isChordHead()).toBeTrue();
    });

    it('returns false when the next note does not have a chord element', () => {
      const note1 = xml.note();
      const note2 = xml.note();

      xml.measure({ notes: [note1, note2] });

      expect(new Note(note1).isChordHead()).toBeFalse();
    });

    it('returns false when the current note has a chord element', () => {
      const note1 = xml.note({ chord: xml.chord() });
      const note2 = xml.note({ chord: xml.chord() });

      xml.measure({ notes: [note1, note2] });

      expect(new Note(note1).isChordHead()).toBeFalse();
    });

    it('returns false when there is no next note', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.isChordHead()).toBeFalse();
    });
  });

  describe('isChordTail', () => {
    it('returns true when the note has a chord element', () => {
      const note1 = xml.note();
      const note2 = xml.note({ chord: xml.chord() });

      xml.measure({ notes: [note1, note2] });

      expect(new Note(note2).isChordTail()).toBeTrue();
    });

    it('returns false when the note does not have a chord element', () => {
      const note1 = xml.note();
      const note2 = xml.note();

      xml.measure({ notes: [note1, note2] });

      expect(new Note(note2).isChordTail()).toBeFalse();
    });
  });

  describe('getChordTail', () => {
    it('returns the chord tail of a note that is a chord head', () => {
      const note1 = xml.note();
      const note2 = xml.note({ chord: xml.chord() });
      const note3 = xml.note({ chord: xml.chord() });

      xml.measure({ notes: [note1, note2, note3] });

      expect(new Note(note1).getChordTail()).toStrictEqual([new Note(note2), new Note(note3)]);
    });

    it('returns an empty array if the note is not a chord head', () => {
      const note1 = xml.note();
      const note2 = xml.note();
      const note3 = xml.note({ chord: xml.chord() });
      const note4 = xml.note({ chord: xml.chord() });

      xml.measure({ notes: [note1, note2, note3, note4] });

      expect(new Note(note1).getChordTail()).toBeEmpty();
    });

    it('returns an empty array if the note is part of a chord tail', () => {
      const note1 = xml.note();
      const note2 = xml.note({ chord: xml.chord() });
      const note3 = xml.note({ chord: xml.chord() });

      xml.measure({ notes: [note1, note2, note3] });

      expect(new Note(note2).getChordTail()).toBeEmpty();
    });

    it('does not include non-chord tail notes before or after the chord', () => {
      const note1 = xml.note();
      const note2 = xml.note();
      const note3 = xml.note({ chord: xml.chord() });
      const note4 = xml.note({ chord: xml.chord() });
      const note5 = xml.note();

      xml.measure({ notes: [note1, note2, note3, note4, note5] });

      expect(new Note(note2).getChordTail()).toStrictEqual([new Note(note3), new Note(note4)]);
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

  describe('getBeams', () => {
    it('returns the beams of the note', () => {
      const beam1 = xml.beam({ number: 4 });
      const beam2 = xml.beam({ number: 2 });
      const node = xml.note({ beams: [beam1, beam2] });
      const note = new Note(node);

      const beams = note.getBeams();

      expect(beams).toStrictEqual([new Beam(beam1), new Beam(beam2)]);
    });
  });

  describe('getLyrics', () => {
    it('returns the lyrics of the note', () => {
      const lyric1 = xml.lyric();
      const lyric2 = xml.lyric();
      const node = xml.note({ lyrics: [lyric1, lyric2] });
      const note = new Note(node);

      const lyrics = note.getLyrics();

      expect(lyrics).toStrictEqual([new Lyric(lyric1), new Lyric(lyric2)]);
    });

    it('returns an empty array if the note does not have any lyrics', () => {
      const node = xml.note();
      const note = new Note(node);

      const lyrics = note.getLyrics();

      expect(lyrics).toStrictEqual([]);
    });
  });

  describe('getTimeModification', () => {
    it('returns the time modification of the note', () => {
      const timeModification = xml.timeModification();
      const node = xml.note({ timeModification });
      const note = new Note(node);
      expect(note.getTimeModification()).toStrictEqual(new TimeModification(timeModification));
    });

    it('defaults to null when missing', () => {
      const node = xml.note();
      const note = new Note(node);
      expect(note.getTimeModification()).toBeNull();
    });
  });
});
