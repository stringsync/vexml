import { Attributes } from './attributes';
import { Measure } from './measure';
import { Note } from './note';
import * as xml from './xml';

describe(Measure, () => {
  describe('getNumber', () => {
    it('returns the measure number', () => {
      const node = xml.measure({ number: '1' });
      const measure = new Measure(node);
      expect(measure.getNumber()).toBe('1');
    });

    it('returns empty string when the measure number is missing', () => {
      const node = xml.measure();
      const measure = new Measure(node);
      expect(measure.getNumber()).toBe('');
    });
  });

  describe('hasWidth', () => {
    it('returns true when the measure width is set', () => {
      const node = xml.measure({ width: 42 });
      const measure = new Measure(node);
      expect(measure.hasWidth()).toBeTrue();
    });

    it('returns false when the measure width is not set', () => {
      const node = xml.measure();
      const measure = new Measure(node);
      expect(measure.hasWidth()).toBeFalse();
    });
  });

  describe('getWidth', () => {
    it('returns the measure width', () => {
      const node = xml.measure({ width: 42 });
      const measure = new Measure(node);
      expect(measure.getWidth()).toBe(42);
    });

    it('returns -1 when the measure width is missing', () => {
      const node = xml.measure();
      const measure = new Measure(node);
      expect(measure.getWidth()).toBe(-1);
    });

    it('returns -1 when the measure width is invalid', () => {
      const node = xml.measure({ width: NaN });
      const measure = new Measure(node);
      expect(measure.getWidth()).toBe(-1);
    });
  });

  describe('getAttributes', () => {
    it('returns the attributes elements', () => {
      const attributes1 = xml.attributes();
      const attributes2 = xml.attributes();
      const node = xml.measure({ attributes: [attributes1, attributes2] });

      const measure = new Measure(node);

      expect(measure.getAttributes()).toStrictEqual([new Attributes(attributes1), new Attributes(attributes2)]);
    });
  });

  describe('getNotes', () => {
    it('returns the notes of the measure', () => {
      const note1 = xml.note();
      const note2 = xml.note();
      const node = xml.measure({ notes: [note1, note2] });

      const measure = new Measure(node);

      expect(measure.getNotes()).toStrictEqual([new Note(note1), new Note(note2)]);
    });
  });
});
