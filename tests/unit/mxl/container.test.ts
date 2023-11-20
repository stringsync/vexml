import { Container, Rootfile } from '@/mxl';
import { xml } from '@/util';

describe(Container, () => {
  describe('getRootfiles', () => {
    it('returns the rootfiles of the container', () => {
      const rootfile1 = xml.rootfile({ fullPath: 'foo.musicxml' });
      const rootfile2 = xml.rootfile({ fullPath: 'bar.musicxml' });
      const node = xml.container({ rootfiles: xml.rootfiles({ rootfiles: [rootfile1, rootfile2] }) });

      const container = new Container(node);

      expect(container.getRootfiles()).toStrictEqual([new Rootfile(rootfile1), new Rootfile(rootfile2)]);
    });

    it('defaults to an empty array when missing', () => {
      const node = xml.container();
      const container = new Container(node);
      expect(container.getRootfiles()).toStrictEqual([]);
    });
  });
});
