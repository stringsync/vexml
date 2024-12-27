import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { Score } from './score';
import { System } from './system';
import { Measure } from './measure';
import { Fragment } from './fragment';
import { FragmentSignature } from './fragmentsignature';
import { Metronome } from './metronome';
import { PartSignature } from './partsignature';
import { Part } from './part';
import { Stave } from './stave';
import { Chorus } from './chorus';
import { MultiRest } from './multirest';

/** Parses a MusicXML document string. */
export class MusicXMLParser {
  parse(musicXMLString: string): data.Document {
    const musicXML = this.parseMusicXMLString(musicXMLString);
    const scorePartwise = musicXML.getScorePartwise();
    const score = new Score({ scorePartwise });
    return this.parseScore(score);
  }

  private parseMusicXMLString(musicXML: string): musicxml.MusicXML {
    const xml = new DOMParser().parseFromString(musicXML, 'application/xml');
    return new musicxml.MusicXML(xml);
  }

  private parseScore(score: Score): data.Document {
    return new data.Document({
      type: 'score',
      title: score.getTitle(),
      systems: score.getSystems().map((system) => this.parseSystem(system)),
    });
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
      label: measure.getLabel(),
      entries: measure.getFragments().map((fragment) => this.parseFragment(fragment)),
    };
  }

  private parseFragment(fragment: Fragment): data.Fragment {
    return {
      type: 'fragment',
      parts: fragment.getParts().map((part) => this.parsePart(part)),
      signature: this.parseFragmentSignature(fragment.getSignature()),
    };
  }

  private parseFragmentSignature(signature: FragmentSignature): data.FragmentSignature {
    return {
      type: 'fragmentsignature',
      metronome: this.parseMetronome(signature.getMetronome()),
    };
  }

  private parseMetronome(metronome: Metronome): data.Metronome {
    return {
      type: 'metronome',
      name: metronome.getName(),
      parenthesis: metronome.getParenthesis(),
      bpm: metronome.getBpm(),
      dots: metronome.getDots(),
      duration: metronome.getDuration(),
      dots2: metronome.getDots2(),
      duration2: metronome.getDuration2(),
    };
  }

  private parsePart(part: Part): data.Part {
    return {
      type: 'part',
      signature: this.parsePartSignature(part.getSignature()),
      staves: part.getStaves().map((stave) => this.parseStave(stave)),
    };
  }

  private parseStave(stave: Stave): data.Stave {
    return {
      type: 'stave',
      entry: this.parseStaveEntry(stave.getEntry()),
    };
  }

  private parsePartSignature(partSignature: PartSignature): data.PartSignature {
    return {
      type: 'partsignature',
      staveCount: partSignature.getStaveCount(),
    };
  }

  private parseStaveEntry(entry: Chorus | MultiRest): data.Chorus | data.MultiRest {
    if (entry instanceof Chorus) {
      return this.parseChorus(entry);
    } else {
      return this.parseMultiRest(entry);
    }
  }

  private parseChorus(chorus: Chorus): data.Chorus {
    return { type: 'chorus' };
  }

  private parseMultiRest(multiRest: MultiRest): data.MultiRest {
    return { type: 'multirest' };
  }
}
