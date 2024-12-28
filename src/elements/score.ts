import { System } from './system';
import { Title } from './title';

export class Score {
  constructor(private title: Title, private systems: System[]) {}

  getTitle(): Title {
    return this.title;
  }

  getSystems(): System[] {
    return this.systems;
  }

  getSystemCount(): number {
    return this.systems.length;
  }
}
