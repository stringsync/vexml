import { System } from './system';

export class Score {
  constructor(private systems: System[]) {}

  getSystems(): System[] {
    return this.systems;
  }

  getSystemCount(): number {
    return this.systems.length;
  }
}
