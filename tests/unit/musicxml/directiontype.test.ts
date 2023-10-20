import { DirectionType, Metronome } from '@/musicxml';
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
  });
});
