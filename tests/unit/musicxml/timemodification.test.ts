import { TimeModification } from '@/musicxml';
import { xml } from '@/util';

describe(TimeModification, () => {
  describe('getActualNotes', () => {
    it('returns the actual notes of of time modification', () => {
      const node = xml.timeModification({
        actualNotes: xml.actualNotes({ value: 3 }),
      });
      const timeModification = new TimeModification(node);
      expect(timeModification.getActualNotes()).toBe(3);
    });

    it('defaults to 1 when missing', () => {
      const node = xml.timeModification();
      const timeModification = new TimeModification(node);
      expect(timeModification.getActualNotes()).toBe(1);
    });

    it('defaults to 1 when invalid', () => {
      const node = xml.timeModification({
        actualNotes: xml.actualNotes({ value: NaN }),
      });
      const timeModification = new TimeModification(node);
      expect(timeModification.getActualNotes()).toBe(1);
    });
  });

  describe('getNormalNotes', () => {
    it('returns the normal notes of of time modification', () => {
      const node = xml.timeModification({
        normalNotes: xml.normalNotes({ value: 2 }),
      });
      const timeModification = new TimeModification(node);
      expect(timeModification.getNormalNotes()).toBe(2);
    });

    it('defaults to 1 when missing', () => {
      const node = xml.timeModification();
      const timeModification = new TimeModification(node);
      expect(timeModification.getNormalNotes()).toBe(1);
    });

    it('defaults to 1 when invalid', () => {
      const node = xml.timeModification({
        normalNotes: xml.normalNotes({ value: NaN }),
      });
      const timeModification = new TimeModification(node);
      expect(timeModification.getNormalNotes()).toBe(1);
    });
  });
});
