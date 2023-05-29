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
      const line = new Line();
      const system = new System();
      line.addSystem(system);

      expect(line.isEmpty()).toBeFalse();
    });
  });

  describe('getSystems', () => {
    it('returns the systems of the line', () => {
      const line = new Line();
      const system = new System();
      line.addSystem(system);

      expect(line.getSystems()).toStrictEqual([system]);
    });
  });

  describe('addSystem', () => {
    it('adds a system to the line', () => {
      const line = new Line();
      const system = new System();
      line.addSystem(system);

      expect(line.getSystems()).toStrictEqual([system]);
    });
  });

  describe('getRequiredWidth', () => {
    it('sums the width of all systems', () => {
      const line = new Line();
      const system1 = new System().addStave(new Stave().setWidth(4));
      const system2 = new System().addStave(new Stave().setWidth(2));
      line.addSystem(system1).addSystem(system2);

      expect(line.getWidth()).toBe(6);
    });
  });
});
