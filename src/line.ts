import { ClefType } from './enums';
import { System } from './system';

export class Line {
  private systems = new Array<System>();
  private timeSignature = '4/4';
  private clef: ClefType = 'treble';

  isEmpty(): boolean {
    return this.systems.length === 0;
  }

  getSystems(): System[] {
    return this.systems;
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  getWidth(): number {
    let width = 0;
    for (const system of this.systems) {
      width += system.getWidth();
    }
    return width;
  }
}
