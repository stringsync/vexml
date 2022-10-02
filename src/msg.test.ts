import * as msg from './msg';

describe('msg', () => {
  describe('attributes', () => {
    it('runs without crashing', () => {
      expect(msg.attributes).not.toThrow();
    });
  });

  describe('barline', () => {
    it('runs without crashing', () => {
      expect(msg.barline).not.toThrow();
    });
  });

  describe('beam', () => {
    it('runs without crashing', () => {
      expect(msg.beam).not.toThrow();
    });
  });

  describe('measureEnd', () => {
    it('runs without crashing', () => {
      expect(msg.measureEnd).not.toThrow();
    });
  });

  describe('measureStart', () => {
    it('runs without crashing', () => {
      expect(msg.measureStart).not.toThrow();
    });
  });

  describe('notation', () => {
    it('runs without crashing', () => {
      expect(msg.notation).not.toThrow();
    });
  });

  describe('note', () => {
    it('runs without crashing', () => {
      expect(msg.note).not.toThrow();
    });
  });

  describe('partEnd', () => {
    it('runs without crashing', () => {
      expect(msg.partEnd).not.toThrow();
    });
  });

  describe('partStart', () => {
    it('runs without crashing', () => {
      expect(msg.partStart).not.toThrow();
    });
  });

  describe('voiceEnd', () => {
    it('runs without crashing', () => {
      expect(msg.voiceEnd).not.toThrow();
    });
  });
});
