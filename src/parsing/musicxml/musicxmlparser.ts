import * as data from '@/data';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import { Score } from './score';
import { System } from './system';
import { Measure } from './measure';
import { Fragment } from './fragment';
import { Part } from './part';
import { FragmentSignature } from './fragmentsignature';
import { Chorus } from './chorus';
import { MultiRest } from './multirest';
import { Stave } from './stave';
import { Metronome } from './metronome';
import { Clef } from './clef';
import { KeySignature } from './keysignature';
import { TimeSignature } from './timesignature';
import { StaveLineCount } from './stavelinecount';

/** Parses a MusicXML document string. */
export class MusicXMLParser {
  parse(musicXML: string): data.Document {
    const xml = new DOMParser().parseFromString(musicXML, 'application/xml');
    const scorePartwise = new musicxml.MusicXML(xml).getScorePartwise();
    const score = this.parseScore(new Score({ scorePartwise }));
    return new data.Document(score);
  }

  private parseScore(score: Score): data.Score {
    return {
      type: 'score',
      title: score.getTitle(),
      systems: score.getSystems().map((system) => this.parseSystem(system)),
    };
  }

  private parseSystem(system: System): data.System {
    return {
      type: 'system',
      measures: system.getMeasures().map((measure) => this.parseMeasure(measure)),
    };
  }

  private parseMeasure(measure: Measure): data.Measure {
    return {
      type: 'measure',
      index: measure.getIndex(),
      label: measure.getLabel(),
      entries: measure.getFragments().map((entry) => this.parseFragment(entry)),
    };
  }

  private parseFragment(fragment: Fragment): data.Fragment {
    return {
      type: 'fragment',
      parts: fragment.getParts().map((part) => this.parsePart(part)),
      signature: this.parseFragmentSignature(fragment.getSignature()),
    };
  }

  private parseFragmentSignature(fragmentSignature: FragmentSignature | null): data.FragmentSignature | null {
    if (!fragmentSignature) {
      return null;
    }

    if (!fragmentSignature.hasChanges()) {
      return null;
    }

    return {
      type: 'fragmentsignature',
      metronome: this.parseMetronome(fragmentSignature.getMetronome()),
      clefs: fragmentSignature.getClefs().map((clef) => this.parseClef(clef)),
      keySignatures: fragmentSignature.getKeySignatures().map((keySignature) => this.parseKeySignature(keySignature)),
      timeSignatures: fragmentSignature
        .getTimeSignatures()
        .map((timeSignature) => this.parseTimeSignature(timeSignature)),
      staveLineCounts: fragmentSignature
        .getStaveLineCounts()
        .map((staveLineCount) => this.parseStaveLineCount(staveLineCount)),
    };
  }

  private parseMetronome(metronome: Metronome): data.Metronome {
    return {
      type: 'metronome',
    };
  }

  private parseClef(clef: Clef): data.Clef {
    return {
      type: 'clef',
      partId: clef.getPartId(),
      staveNumber: clef.getStaveNumber(),
      line: clef.getLine(),
      sign: clef.getSign(),
      octaveChange: clef.getOctaveChange(),
    };
  }

  private parseKeySignature(keySignature: KeySignature): data.KeySignature {
    return {
      type: 'keysignature',
      partId: keySignature.getPartId(),
      staveNumber: keySignature.getStaveNumber(),
      fifths: keySignature.getFifths(),
      previousKeySignature: this.parsePreviousKeySignature(keySignature.getPreviousKeySignature()),
      mode: keySignature.getMode(),
    };
  }

  private parsePreviousKeySignature(previousKeySignature: KeySignature | null): data.PreviousKeySignature | null {
    if (!previousKeySignature) {
      return null;
    }

    return {
      type: 'previouskeysignature',
      partId: previousKeySignature.getPartId(),
      staveNumber: previousKeySignature.getStaveNumber(),
      fifths: previousKeySignature.getFifths(),
      mode: previousKeySignature.getMode(),
    };
  }

  private parseTimeSignature(timeSignature: TimeSignature): data.TimeSignature {
    return {
      type: 'timesignature',
      partId: timeSignature.getPartId(),
      staveNumber: timeSignature.getStaveNumber(),
      components: timeSignature.getComponents().map((component) => this.parseFraction(component)),
    };
  }

  private parseFraction(fraction: util.Fraction): data.Fraction {
    return {
      type: 'fraction',
      numerator: fraction.numerator,
      denominator: fraction.denominator,
    };
  }

  private parseStaveLineCount(staveLineCount: StaveLineCount): data.StaveLineCount {
    return {
      type: 'stavelinecount',
      partId: staveLineCount.getPartId(),
      staveNumber: staveLineCount.getStaveNumber(),
      lineCount: staveLineCount.getLineCount(),
    };
  }

  private parsePart(part: Part): data.Part {
    return {
      type: 'part',
      id: part.getId(),
      staves: part.getStaves().map((stave) => this.parseStave(stave)),
    };
  }

  private parseStave(stave: Stave): data.Stave {
    const entry = stave.getEntry();

    return {
      type: 'stave',
      entry: entry instanceof Chorus ? this.parseChorus(entry) : this.parseMultiRest(entry),
    };
  }

  private parseChorus(chorus: Chorus): data.Chorus {
    return {
      type: 'chorus',
    };
  }

  private parseMultiRest(multiRest: MultiRest): data.MultiRest {
    return {
      type: 'multirest',
    };
  }
}
