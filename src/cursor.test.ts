import { Cursor } from './cursor';

const createMusicXml = (opts: { numMeasures: number }): string => {
  const measures = '<measure></measure>'.repeat(opts.numMeasures);
  return `<score-partwise><part>${measures}</part></score-partwise>`;
};

describe('Cursor', () => {
  describe('fromString', () => {
    it('creates a cursor from a musicXml string', () => {
      const musicXml = createMusicXml({ numMeasures: 5 });
      expect(() => Cursor.fromMusicXml(musicXml)).not.toThrow();
    });

    it('does not throw for invalid strings', () => {
      const musicXml = 'some malformed musicXml string';
      expect(() => Cursor.fromMusicXml(musicXml)).not.toThrow();
    });
  });

  describe('next', () => {
    it('returns the next node', () => {
      const musicXml = createMusicXml({ numMeasures: 1 });
      const cursor = Cursor.fromMusicXml(musicXml);

      const node = cursor.next();

      expect(node).not.toBeNull();
    });

    it('throws an error if there is no next node', () => {
      const musicXml = createMusicXml({ numMeasures: 0 });
      const cursor = Cursor.fromMusicXml(musicXml);

      expect(() => cursor.next()).toThrow();
    });

    it('returns multiple next nodes, then throws when done', () => {
      const musicXml = createMusicXml({ numMeasures: 2 });
      const cursor = Cursor.fromMusicXml(musicXml);

      const node1 = cursor.next();
      const node2 = cursor.next();

      expect(node1).not.toBeNull();
      expect(node2).not.toBeNull();
      expect(node1).not.toBe(node2);
      expect(() => cursor.next()).toThrow();
    });

    it('does not have a next for invalid musicXml strings', () => {
      const musicXml = 'some malformed musicXml string';
      const cursor = Cursor.fromMusicXml(musicXml);

      expect(() => cursor.next()).toThrow();
    });
  });

  describe('hasNext', () => {
    it('returns true when there is a next node', () => {
      const musicXml = createMusicXml({ numMeasures: 1 });
      const cursor = Cursor.fromMusicXml(musicXml);

      expect(cursor.hasNext()).toBeTrue();
    });

    it('returns false when there is not a next node', () => {
      const musicXml = createMusicXml({ numMeasures: 0 });
      const cursor = Cursor.fromMusicXml(musicXml);

      expect(cursor.hasNext()).toBeFalse();
    });
  });
});
