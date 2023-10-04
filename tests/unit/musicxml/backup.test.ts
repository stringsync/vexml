import { xml } from '@/util';
import { Backup } from '@/musicxml';

describe('backup', () => {
  describe('getDuration', () => {
    it('returns the number of divisions to backup when processing notes', () => {
      const node = xml.backup({ duration: xml.duration({ positiveDivisions: 2 }) });
      const backup = new Backup(node);
      expect(backup.getDuration()).toBe(2);
    });

    it('defaults to 4 when not specified', () => {
      const node = xml.backup();
      const backup = new Backup(node);
      expect(backup.getDuration()).toBe(4);
    });
  });
});
