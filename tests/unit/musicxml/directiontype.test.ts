import { DirectionType, Metronome, Symbolic, Wedge, Words } from '@/musicxml';
import { xml } from '@/util';

describe(DirectionType, () => {
  describe('getContent', () => {
    it('returns the metronome when supplied', () => {
      const metronome = xml.metronome();
      const node = xml.directionType({ metronome });

      const directionType = new DirectionType(node);

      expect(directionType.getContent()).toStrictEqual({
        type: 'metronome',
        metronome: new Metronome(metronome),
      });
    });

    it('returns the wedge when supplied', () => {
      const wedge = xml.wedge();
      const node = xml.directionType({ wedge });

      const directionType = new DirectionType(node);

      expect(directionType.getContent()).toStrictEqual({
        type: 'wedge',
        wedge: new Wedge(wedge),
      });
    });

    it('returns an empty content when it does not have any children', () => {
      const node = xml.directionType();
      const directionType = new DirectionType(node);
      expect(directionType.getContent()).toStrictEqual({ type: 'empty' });
    });

    it('returns an unsupported content when the content is not supported', () => {
      const node = xml.directionType({
        codas: [xml.coda()],
      });
      const directionType = new DirectionType(node);
      expect(directionType.getContent()).toStrictEqual({
        type: 'unsupported',
        tagNames: ['coda'],
      });
    });

    it('returns tokens when the first child is a words', () => {
      const words = xml.words();
      const node = xml.directionType({
        tokens: [words],
      });
      const directionType = new DirectionType(node);
      expect(directionType.getContent()).toStrictEqual({
        type: 'tokens',
        tokens: [new Words(words)],
      });
    });

    it('returns tokens when the first child is a symbolic', () => {
      const symbolic = xml.symbolic();
      const node = xml.directionType({
        tokens: [symbolic],
      });
      const directionType = new DirectionType(node);
      expect(directionType.getContent()).toStrictEqual({
        type: 'tokens',
        tokens: [new Symbolic(symbolic)],
      });
    });

    it('returns multiple tokens when provided', () => {
      const words = xml.words();
      const symbolic = xml.symbolic();
      const node = xml.directionType({
        tokens: [words, symbolic],
      });
      const directionType = new DirectionType(node);
      expect(directionType.getContent()).toStrictEqual({
        type: 'tokens',
        tokens: [new Words(words), new Symbolic(symbolic)],
      });
    });
  });
});
