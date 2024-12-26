import * as musicxml from '@/musicxml';
import { Stave } from './stave';

export class Part {
  constructor(private id: string) {}

  getId(): string {
    return this.id;
  }

  getStaves(): Stave[] {
    return [];
  }
}
