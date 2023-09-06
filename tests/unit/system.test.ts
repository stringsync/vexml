import * as vexflow from 'vexflow';
import { Stave } from '@/stave';
import { System } from '@/system';
import { Voice } from '@/voice';

describe(System, () => {
  describe('getStaves', () => {
    it('returns the staves', () => {
      const stave = new Stave();
      const system = new System().addStave(stave);

      expect(system.getStaves()).toStrictEqual([stave]);
    });
  });

  describe('addStave', () => {
    it('adds a stave', () => {
      const stave = new Stave();
      const system = new System().addStave(stave);

      expect(system.getStaves()).toStrictEqual([stave]);
    });
  });

  describe('getWidth', () => {
    it('returns the max width of the staves', () => {
      const stave1 = new Stave().setWidth(42);
      const stave2 = new Stave().setWidth(43);
      const system = new System().addStave(stave1).addStave(stave2);

      expect(system.getWidth()).toBe(43);
    });

    it('returns 0 when there are no staves', () => {
      const system = new System();
      expect(system.getWidth()).toBe(0);
    });
  });

  describe('setWidth', () => {
    it('sets the width of all staves', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();
      const system = new System().addStave(stave1).addStave(stave2);

      system.setWidth(42);

      expect(stave1.getWidth()).toBe(42);
      expect(stave2.getWidth()).toBe(42);
    });
  });

  describe('setX', () => {
    it('sets X of all staves', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();
      const system = new System().addStave(stave1).addStave(stave2);

      system.setX(42);

      expect(stave1.getX()).toBe(42);
      expect(stave2.getX()).toBe(42);
    });
  });

  describe('setY', () => {
    it('sets Y of all staves', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();
      const system = new System().addStave(stave1).addStave(stave2);

      system.setY(42);

      expect(stave1.getY()).toBe(42);
      expect(stave2.getY()).toBe(42);
    });
  });

  describe('getJustifyWidth', () => {
    it('returns the max justify width of the staves', () => {
      const stave1 = new Stave();
      const stave2 = new Stave().addVoice(
        new Voice().addTickables([
          new vexflow.StaveNote({
            keys: ['C/4'],
            duration: '4',
          }),
        ])
      );
      const system = new System().addStave(stave1).addStave(stave2);

      expect(system.getJustifyWidth()).toBe(stave2.getJustifyWidth());
    });

    it('returns 0 when there are no staves', () => {
      const system = new System();
      expect(system.getJustifyWidth()).toBe(0);
    });
  });

  describe('getModifiersWidth', () => {
    it('returns the max modifiers width of the staves', () => {
      const stave1 = new Stave();
      const stave2 = new Stave().setClef('treble');
      const system = new System().addStave(stave1).addStave(stave2);

      expect(system.getModifiersWidth()).toBe(stave2.getModifiersWidth());
    });

    it('returns 0 when there are no staves', () => {
      const system = new System();
      expect(system.getModifiersWidth()).toBe(0);
    });
  });

  describe('getFirstStave', () => {
    it('returns the first stave when it exists', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();
      const system = new System().addStave(stave1).addStave(stave2);

      expect(system.getFirstStave()).toBe(stave1);
    });

    it('returns undefined when there are no staves', () => {
      const system = new System();
      expect(system.getFirstStave()).toBeUndefined();
    });
  });

  describe('getLastStave', () => {
    it('returns the last stave when it exists', () => {
      const stave1 = new Stave();
      const stave2 = new Stave();
      const system = new System().addStave(stave1).addStave(stave2);

      expect(system.getLastStave()).toBe(stave2);
    });

    it('returns undefined when there are no staves', () => {
      const system = new System();
      expect(system.getLastStave()).toBeUndefined();
    });
  });
});
