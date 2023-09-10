import { System } from './system';
import * as musicxml from '@/musicxml';

/**
 * Represents a Score in a musical composition, serving as the top-level container
 * for all musical elements and metadata. The Score encompasses the entirety of a piece,
 * housing individual parts, systems, and other musical components. It also provides
 * contextual information like title, composer, and other pertinent details.
 */
export class Score {
  static fromMusicXml(musicXml: musicxml.MusicXml): Score {
    const parts = musicXml.getScorePartwise()?.getParts() ?? [];
    const system = System.fromMusicXml(parts);

    return new Score(system);
  }

  constructor(private system: System) {}

  render(width: number): void {
    this.system.split(width).forEach((system) => system.render());
  }
}
