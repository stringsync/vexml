import { Rootfile } from '@/mxl';
import { xml } from '@/util';

describe(Rootfile, () => {
  describe('getFullPath', () => {
    it('returns the full path of the rootfile', () => {
      const node = xml.rootfile({ fullPath: 'foo' });
      const rootfile = new Rootfile(node);
      expect(rootfile.getFullPath()).toBe('foo');
    });

    it('defaults to an empty string when missing', () => {
      const node = xml.rootfile();
      const rootfile = new Rootfile(node);
      expect(rootfile.getFullPath()).toBe('');
    });
  });

  describe('getMediaType', () => {
    it('returns the media type of the rootfile', () => {
      const node = xml.rootfile({ mediaType: 'text/foo' });
      const rootfile = new Rootfile(node);
      expect(rootfile.getMediaType()).toBe('text/foo');
    });

    it('defaults to musicxml mime type when missing', () => {});
    const node = xml.rootfile();
    const rootfile = new Rootfile(node);
    expect(rootfile.getMediaType()).toBe('application/vnd.recordare.musicxml+xml');
  });
});
