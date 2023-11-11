import { START_STOP_CONTINUE, WavyLine } from '@/musicxml';
import { xml } from '@/util';

describe(WavyLine, () => {
  describe('getNumber', () => {
    it('returns the number of the wavy line', () => {
      const node = xml.wavyLine({ number: 42 });
      const wavyLine = new WavyLine(node);
      expect(wavyLine.getNumber()).toBe(42);
    });

    it('defaults to 1 when the number is not specified', () => {
      const node = xml.wavyLine();
      const wavyLine = new WavyLine(node);
      expect(wavyLine.getNumber()).toBe(1);
    });
  });

  describe('getType', () => {
    it.each(START_STOP_CONTINUE.values)(`returns the type of the wavy line: '%s'`, (type) => {
      const node = xml.wavyLine({ type });
      const wavyLine = new WavyLine(node);
      expect(wavyLine.getType()).toBe(type);
    });

    it(`defaults to 'start' when not specified`, () => {
      const node = xml.wavyLine();
      const wavyLine = new WavyLine(node);
      expect(wavyLine.getType()).toBe('start');
    });

    it(`defaults to 'start' when invalid`, () => {
      const node = xml.wavyLine({ type: 'foo' });
      const wavyLine = new WavyLine(node);
      expect(wavyLine.getType()).toBe('start');
    });
  });
});
