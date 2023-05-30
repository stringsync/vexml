import { Line } from './line';
import { Stave } from './stave';
import { System } from './system';

describe(Line, () => {
  describe('isEmpty', () => {
    it('returns true when there are no systems', () => {
      const line = new Line();

      expect(line.isEmpty()).toBeTrue();
    });

    it('returns false when there is at least one system', () => {
      const system = new System();
      const line = new Line();
      line.addSystem(system);

      expect(line.isEmpty()).toBeFalse();
    });
  });

  describe('getSystems', () => {
    it('returns the systems of the line', () => {
      const system = new System();
      const line = new Line();
      line.addSystem(system);

      expect(line.getSystems()).toStrictEqual([system]);
    });
  });

  describe('addSystem', () => {
    it('adds a system to the line', () => {
      const system = new System();
      const line = new Line();
      line.addSystem(system);

      expect(line.getSystems()).toStrictEqual([system]);
    });
  });

  describe('getWidth', () => {
    it('sums the width of all systems', () => {
      const stave1 = new Stave();
      stave1.setWidth(4);

      const stave2 = new Stave();
      stave2.setWidth(2);

      const system1 = new System();
      system1.addStave(stave1);

      const system2 = new System();
      system2.addStave(stave2);

      const line = new Line();
      line.addSystem(system1);
      line.addSystem(system2);

      expect(line.getWidth()).toBe(6);
    });
  });

  describe('fit', () => {
    it('adds width to systems to meet width', () => {
      const stave = new Stave();
      stave.setWidth(1);

      const system = new System();
      system.addStave(stave);

      const line = new Line();
      line.addSystem(system);

      line.fit(5);

      expect(system.getWidth()).toBe(5);
      expect(stave.getWidth()).toBe(5);
    });

    it('removes width from systems to meet width', () => {
      const stave = new Stave();
      stave.setWidth(10);

      const system = new System();
      system.addStave(stave);

      const line = new Line();
      line.addSystem(system);

      line.fit(5);

      expect(system.getWidth()).toBe(5);
      expect(stave.getWidth()).toBe(5);
    });

    it('distributes the remaining width based on the current width distribution', () => {
      const stave1 = new Stave();
      stave1.setWidth(1);
      const stave2 = new Stave();
      stave2.setWidth(2);
      const stave3 = new Stave();
      stave3.setWidth(1);

      const system1 = new System();
      system1.addStave(stave1);
      const system2 = new System();
      system2.addStave(stave2);
      const system3 = new System();
      system3.addStave(stave3);

      const line = new Line();
      line.addSystem(system1);
      line.addSystem(system2);
      line.addSystem(system3);

      line.fit(8);

      expect(system1.getWidth()).toBe(2);
      expect(system2.getWidth()).toBe(4);
      expect(system3.getWidth()).toBe(2);
      expect(stave1.getWidth()).toBe(2);
      expect(stave2.getWidth()).toBe(4);
      expect(stave1.getWidth()).toBe(2);
    });

    it('throws when any system has 0 width', () => {
      const stave = new Stave();
      stave.setWidth(0);

      const system = new System();
      system.addStave(stave);

      const line = new Line();
      line.addSystem(system);

      expect(() => line.fit(5)).toThrow();
    });

    it('does not throw when line is empty', () => {
      const line = new Line();

      expect(() => line.fit(5)).not.toThrow();
    });
  });

  describe('setBeginningModifiers', () => {
    it('updates the first stave modifiers', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();

      const system1 = new System();
      system1.addStave(stave1);
      const system2 = new System();
      system2.addStave(stave2);

      const line = new Line();
      line.addSystem(system1);
      line.addSystem(system2);

      line.setBeginningModifiers({ timeSignature: '6/8', clef: 'alto' });

      expect(stave1.getTimeSignature()).toBe('6/8');
      expect(stave1.getClef()).toBe('alto');
    });

    it('does not affect staves after the first one', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();

      const system1 = new System();
      system1.addStave(stave1);
      const system2 = new System();
      system2.addStave(stave2);

      const line = new Line();
      line.addSystem(system1);
      line.addSystem(system2);

      line.setBeginningModifiers({ timeSignature: '6/8', clef: 'alto' });

      expect(stave2.getTimeSignature()).toBeUndefined();
      expect(stave2.getClef()).toBeUndefined();
    });

    it('changes the width of the stave to account for the modifiers', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();

      const system1 = new System();
      system1.addStave(stave1);
      const system2 = new System();
      system2.addStave(stave2);

      const line = new Line();
      line.addSystem(system1);
      line.addSystem(system2);

      const prevStave1 = stave1.clone();
      line.setBeginningModifiers({ timeSignature: '6/8', clef: 'alto' });

      expect(stave1.getWidth()).toBeGreaterThan(prevStave1.getWidth());
    });
  });

  describe('hasEndBarType', () => {
    it('returns true when there is an end bar', () => {
      const stave = new Stave();
      stave.setEndBarStyle('regular');

      const system = new System();
      system.addStave(stave);

      const line = new Line();
      line.addSystem(system);

      expect(line.hasEndBarType()).toBeTrue();
    });

    it('returns false when there is not an end bar', () => {
      const stave = new Stave();

      const system = new System();
      system.addStave(stave);

      const line = new Line();
      line.addSystem(system);

      expect(line.hasEndBarType()).toBeFalse();
    });
  });

  describe('setEndBarType', () => {
    it('sets the end bar of the last stave', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();

      const system1 = new System();
      system1.addStave(stave1);
      const system2 = new System();
      system2.addStave(stave2);

      const line = new Line();
      line.addSystem(system1);
      line.addSystem(system2);

      line.setEndBarType('regular');

      expect(stave2.getEndBarStyle()).toBe('regular');
    });

    it('does not affects staves before the last one', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();

      const system1 = new System();
      system1.addStave(stave1);
      const system2 = new System();
      system2.addStave(stave2);

      const line = new Line();
      line.addSystem(system1);
      line.addSystem(system2);

      line.setEndBarType('regular');

      expect(stave1.getEndBarStyle()).toBeUndefined();
    });
  });

  describe('getFirstSystem', () => {
    it('returns the first system when it exists', () => {
      const system1 = new System();
      const system2 = new System();

      const line = new Line();
      line.addSystem(system1);
      line.addSystem(system2);

      expect(line.getFirstSystem()).toBe(system1);
    });

    it('returns undefined when the first does not exist', () => {
      const line = new Line();

      expect(line.getFirstSystem()).toBeUndefined();
    });
  });

  describe('getLastSystem', () => {
    it('returns the last system when it exists', () => {
      const system1 = new System();
      const system2 = new System();

      const line = new Line();
      line.addSystem(system1);
      line.addSystem(system2);

      expect(line.getLastSystem()).toBe(system2);
    });

    it('returns undefined when the last does not exist', () => {
      const line = new Line();

      expect(line.getLastSystem()).toBeUndefined();
    });
  });
});
