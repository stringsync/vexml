import { PartIterator, PartIteratorError } from './partiterator';

const createMusicXml = (opts: { numParts: number }): string => {
  const parts = '<part></part>'.repeat(opts.numParts);
  return `<score-partwise>${parts}</score-partwise>`;
};

describe('PartIterator', () => {
  describe('fromString', () => {
    it('creates an iterator from a musicXml string', () => {
      const musicXml = createMusicXml({ numParts: 2 });
      const iterator = PartIterator.fromString(musicXml);
      expect(iterator).toBeInstanceOf(PartIterator);
    });

    it('does not throw for invalid strings', () => {
      const musicXml = 'some malformed musicXml string';
      const iterator = PartIterator.fromString(musicXml);
      expect(iterator).toBeInstanceOf(PartIterator);
    });
  });

  describe('fromRoot', () => {
    it('creates an iterator from a document', () => {
      const musicXml = createMusicXml({ numParts: 2 });
      const root = new DOMParser().parseFromString(musicXml, 'application/xml');

      const iterator = PartIterator.fromRoot(root);

      expect(iterator).toBeInstanceOf(PartIterator);
    });
  });

  describe('next', () => {
    it('returns the next node', () => {
      const musicXml = createMusicXml({ numParts: 1 });
      const iterator = PartIterator.fromString(musicXml);

      const node = iterator.next();

      expect(node).not.toBeNull();
    });

    it('throws an error if there is no next node', () => {
      const musicXml = createMusicXml({ numParts: 0 });
      const iterator = PartIterator.fromString(musicXml);

      expect(() => iterator.next()).toThrow(PartIteratorError);
    });

    it('returns multiple next nodes, then throws when done', () => {
      const musicXml = createMusicXml({ numParts: 2 });
      const iterator = PartIterator.fromString(musicXml);

      const node1 = iterator.next();
      const node2 = iterator.next();

      expect(node1).not.toBeNull();
      expect(node2).not.toBeNull();
      expect(node1).not.toBe(node2);
      expect(() => iterator.next()).toThrow(PartIteratorError);
    });

    it('does not have a next for invalid musicXml strings', () => {
      const musicXml = 'some malformed musicXml string';
      const iterator = PartIterator.fromString(musicXml);

      expect(() => iterator.next()).toThrow(PartIteratorError);
    });
  });

  describe('hasNext', () => {
    it('returns true when there is a next node', () => {
      const musicXml = createMusicXml({ numParts: 1 });
      const iterator = PartIterator.fromString(musicXml);

      expect(iterator.hasNext()).toBeTrue();
    });

    it('returns false when there is not a next node', () => {
      const musicXml = createMusicXml({ numParts: 0 });
      const iterator = PartIterator.fromString(musicXml);

      expect(iterator.hasNext()).toBeFalse();
    });
  });
});
