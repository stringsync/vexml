import * as musicxml from '@/musicxml';
import { Voice } from './voice';

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML.
 * A Measure contains a specific segment of musical content, defined by its beginning and ending beats,
 * and is the primary unit of time in a score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  static fromMusicXml(measure: musicxml.Measure): Measure {
    // TODO(jared) Figure out how to get multiple voices.

    return new Measure([]);
  }

  constructor(private voices: Voice[]) {}
}
