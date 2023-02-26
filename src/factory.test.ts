import { Factory } from './factory';
import * as vexflow from 'vexflow';

describe(Factory, () => {
  let factory: Factory;

  beforeEach(() => {
    const elementId = 'foo';
    const div = document.createElement('div');
    div.setAttribute('id', elementId);
    document.body.appendChild(div);
    factory = new Factory({ renderer: { elementId, width: 1200, height: 600 } });
  });

  describe('constructor', () => {
    it('wraps vexflow.Factory', () => {
      expect(factory).toBeInstanceOf(vexflow.Factory);
    });
  });

  describe('getSystems', () => {
    it('returns all the systems that were created', () => {
      const systems = [factory.System(), factory.System(), factory.System()];
      expect(factory.getSystems()).toStrictEqual(systems);
    });

    it('returns a new array each time', () => {
      factory.System();
      factory.System();

      const systems1 = factory.getSystems();
      const systems2 = factory.getSystems();

      expect(systems1).toStrictEqual(systems2);
      expect(systems1).not.toBe(systems2);
    });
  });

  describe('getCurrentSystem', () => {
    it('returns the last system that was made', () => {
      const system1 = factory.System();
      const system2 = factory.System();

      const currentSystem = factory.getCurrentSystem();

      expect(currentSystem).not.toBeNull();
      expect(currentSystem).not.toBe(system1);
      expect(currentSystem).toBe(system2);
    });

    it('returns null if no system that was made', () => {
      expect(factory.getCurrentSystem()).toBeNull();
    });
  });

  describe('getPreviousSystem', () => {
    it('returns the second-to-last system that was made', () => {
      const system1 = factory.System();
      const system2 = factory.System();

      const previousSystem = factory.getPreviousSystem();

      expect(previousSystem).not.toBeNull();
      expect(previousSystem).not.toBe(system2);
      expect(previousSystem).toBe(system1);
    });

    it('returns null if less than two systems were made', () => {
      const system = factory.System();
      const previousSystem = factory.getPreviousSystem();
      expect(previousSystem).not.toBe(system);
      expect(previousSystem).toBeNull();
    });
  });

  describe('getRendererWidth', () => {
    it('returns the width of the renderer', () => {
      expect(factory.getRendererWidth()).toBe(1200);
    });
  });
});
