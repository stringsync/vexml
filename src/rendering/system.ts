import * as musicxml from '@/musicxml';
import { Part } from './part';

/**
 * Represents a System in a musical score, a horizontal grouping of staves spanning the width
 * of the viewport or page. Each system contains a segment of musical content from one or more
 * parts, and multiple systems collectively render the entirety of those parts.
 */
export class System {
  static fromMusicXml(musicXmlParts: musicxml.Part[]): System {
    const parts = musicXmlParts.map(Part.fromMusicXml);
    return new System(parts);
  }

  constructor(private parts: Part[]) {}

  split(width: number): System[] {
    return [];
  }

  render(): void {
    // noop
  }
}
