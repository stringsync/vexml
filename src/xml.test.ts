import * as xml from './xml';

describe('xml', () => {
  describe('createElement', () => {
    it('runs without crashing', () => {
      expect(() => xml.createElement('foo')).not.toThrow();
    });
  });

  describe('attributes', () => {
    it('runs without crashing', () => {
      expect(xml.attributes).not.toThrow();
    });
  });

  describe('barline', () => {
    it('runs without crashing', () => {
      expect(xml.barline).not.toThrow();
    });
  });

  describe('measure', () => {
    it('runs without crashing', () => {
      expect(xml.measure).not.toThrow();
    });
  });

  describe('note', () => {
    it('runs without crashing', () => {
      expect(xml.note).not.toThrow();
    });
  });

  describe('part', () => {
    it('runs without crashing', () => {
      expect(xml.part).not.toThrow();
    });
  });

  describe('scorePartwise', () => {
    it('runs without crashing', () => {
      expect(xml.scorePartwise).not.toThrow();
    });
  });

  describe('staves', () => {
    it('runs without crashing', () => {
      expect(xml.staves).not.toThrow();
    });
  });
});
