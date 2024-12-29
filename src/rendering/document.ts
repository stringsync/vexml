import * as data from '@/data';
import * as util from '@/util';
import {
  SystemKey,
  MeasureKey,
  MeasureEntryKey,
  PartKey,
  StaveKey,
  VoiceKey,
  VoiceEntryKey,
  SystemArrangement,
} from './types';

/** A wrapper around {@link data.Document} that provides querying capabilities. */
export class Document {
  constructor(private data: data.Document) {}

  getTitle(): data.Title | null {
    return this.data.score.title;
  }

  getScore(): data.Score {
    return this.data.score;
  }

  getSystems(): data.System[] {
    return this.data.score.systems;
  }

  getSystem(key: SystemKey): data.System {
    const system = this.getSystems().at(key.systemIndex);
    util.assertDefined(system);
    return system;
  }

  getMeasures(key: SystemKey): data.Measure[] {
    return this.getSystem(key).measures;
  }

  getMeasure(key: MeasureKey): data.Measure {
    const measure = this.getMeasures(key).at(key.measureIndex);
    util.assertDefined(measure);
    return measure;
  }

  getMeasureEntries(key: MeasureKey): data.MeasureEntry[] {
    return this.getMeasure(key).entries;
  }

  getFragment(key: MeasureEntryKey): data.Fragment {
    const entry = this.getMeasureEntries(key).at(key.measureEntryIndex);
    util.assert(entry?.type === 'fragment', 'expected entry to be a fragment');
    return entry;
  }

  getGap(key: MeasureEntryKey): data.Gap {
    const entry = this.getMeasureEntries(key).at(key.measureEntryIndex);
    util.assert(entry?.type === 'gap', 'expected entry to be a gap');
    return entry;
  }

  getParts(key: MeasureEntryKey): data.Part[] {
    return this.getFragment(key).parts;
  }

  getPart(key: PartKey): data.Part {
    const part = this.getParts(key).at(key.partIndex);
    util.assertDefined(part);
    return part;
  }

  getStaves(key: PartKey): data.Stave[] {
    return this.getPart(key).staves;
  }

  getStave(key: StaveKey): data.Stave {
    const stave = this.getStaves(key).at(key.staveIndex);
    util.assertDefined(stave);
    return stave;
  }

  getVoices(key: StaveKey): data.Voice[] {
    return this.getStave(key).voices;
  }

  getVoice(key: VoiceKey): data.Voice {
    const voice = this.getVoices(key).at(key.voiceIndex);
    util.assertDefined(voice);
    return voice;
  }

  getVoiceEntries(key: VoiceKey): data.VoiceEntry[] {
    return this.getVoice(key).entries;
  }

  getNote(key: VoiceEntryKey): data.Note {
    const entry = this.getVoiceEntries(key).at(key.voiceEntryIndex);
    util.assert(entry?.type === 'note', 'expected entry to be a note');
    return entry;
  }

  /** Returns a new document with the system arrangements applied. */
  reflow(width: number, arrangements: SystemArrangement[]): Document {
    const clone = this.clone();

    const measures = this.data.score.systems.flatMap((s) => s.measures);

    this.data.score.systems = [];

    for (const arrangement of arrangements) {
      const system: data.System = {
        type: 'system',
        measures: new Array<data.Measure>(),
      };

      for (const measureIndex of arrangement.measureIndexes) {
        // TODO: Update the measure width to stretch to the system width.
        system.measures.push(measures[measureIndex]);
      }

      this.data.score.systems.push(system);
    }

    return clone;
  }

  private clone(): Document {
    const score = util.deepClone(this.data.score);
    const document = new data.Document(score);
    return new Document(document);
  }
}
