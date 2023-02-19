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
});
