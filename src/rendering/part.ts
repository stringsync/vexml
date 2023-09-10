import * as musicxml from '@/musicxml';
import { Stave } from './stave';

export class Part {
  static fromMusicXml(part: musicxml.Part): Part {
    const id = part.getId();

    // TODO(jared): Figure out how to break down a part into multiple staves.

    return new Part(id, []);
  }

  constructor(private id: string, private staves: Stave[]) {}

  getId(): string {
    return this.id;
  }

  render(): void {
    // noop
  }
}
