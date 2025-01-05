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
  PartLabelKey,
} from './types';

/** A wrapper around {@link data.Document} that provides querying capabilities. */
export class Document {
  constructor(private data: data.Document) {}

  getTitle(): string | null {
    return this.data.score.title;
  }

  getPartLabel(key: PartLabelKey): string {
    return this.data.score.partLabels.at(key.partIndex) ?? '';
  }

  getScore(): data.Score {
    return this.data.score;
  }

  getSystems(): data.System[] {
    return this.data.score.systems;
  }

  getSystemCount(): number {
    return this.getSystems().length;
  }

  isFirstSystem(key: SystemKey): boolean {
    return key.systemIndex === 0;
  }

  isLastSystem(key: SystemKey): boolean {
    return key.systemIndex === this.getSystemCount() - 1;
  }

  getPreviousSystem(key: SystemKey): data.System | null {
    if (key.systemIndex > 0) {
      const previousSystem = this.getSystems().at(key.systemIndex - 1);
      util.assertDefined(previousSystem);
      return previousSystem;
    }
    return null;
  }

  getSystem(key: SystemKey): data.System {
    const system = this.getSystems().at(key.systemIndex);
    util.assertDefined(system);
    return system;
  }

  getNextSystem(key: SystemKey): data.System | null {
    if (key.systemIndex < this.getSystemCount() - 1) {
      const nextSystem = this.getSystems().at(key.systemIndex + 1);
      util.assertDefined(nextSystem);
      return nextSystem;
    }
    return null;
  }

  getMeasures(key: SystemKey): data.Measure[] {
    return this.getSystem(key).measures;
  }

  getMeasureCount(key: SystemKey): number {
    return this.getMeasures(key).length;
  }

  isFirstMeasure(key: MeasureKey): boolean {
    return key.measureIndex === 0;
  }

  isLastMeasure(key: MeasureKey): boolean {
    return key.measureIndex === this.getMeasureCount(key) - 1;
  }

  getPreviousMeasure(key: MeasureKey): data.Measure | null {
    if (key.measureIndex > 0) {
      const previousMeasure = this.getMeasures(key).at(key.measureIndex - 1);
      util.assertDefined(previousMeasure);
      return previousMeasure;
    }
    return this.getPreviousSystem(key)?.measures.at(-1) ?? null;
  }

  getMeasure(key: MeasureKey): data.Measure {
    const measure = this.getMeasures(key).at(key.measureIndex);
    util.assertDefined(measure);
    return measure;
  }

  getNextMeasure(key: MeasureKey): data.Measure | null {
    if (key.measureIndex < this.getMeasureCount(key) - 1) {
      const nextMeasure = this.getMeasures(key).at(key.measureIndex + 1);
      util.assertDefined(nextMeasure);
      return nextMeasure;
    }
    return this.getNextSystem(key)?.measures.at(0) ?? null;
  }

  getAbsoluteMeasureIndex(key: MeasureKey): number {
    const measures = this.getSystems().flatMap((s) => s.measures);
    return measures.indexOf(this.getMeasure(key));
  }

  getMeasureEntries(key: MeasureKey): data.MeasureEntry[] {
    return this.getMeasure(key).entries;
  }

  getMeasureEntryCount(key: MeasureKey): number {
    return this.getMeasureEntries(key).length;
  }

  isFirstMeasureEntry(key: MeasureEntryKey): boolean {
    return key.measureEntryIndex === 0;
  }

  isLastMeasureEntry(key: MeasureEntryKey): boolean {
    return key.measureEntryIndex === this.getMeasureEntryCount(key) - 1;
  }

  getPreviousMeasureEntry(key: MeasureEntryKey): data.MeasureEntry | null {
    if (key.measureEntryIndex > 0) {
      const previousEntry = this.getMeasureEntries(key).at(key.measureEntryIndex - 1);
      util.assertDefined(previousEntry);
      return previousEntry;
    }
    return this.getPreviousMeasure(key)?.entries.at(-1) ?? null;
  }

  getMeasureEntry(key: MeasureEntryKey): data.MeasureEntry {
    const entry = this.getMeasureEntries(key).at(key.measureEntryIndex);
    util.assertDefined(entry);
    return entry;
  }

  getNextMeasureEntry(key: MeasureEntryKey): data.MeasureEntry | null {
    if (key.measureEntryIndex < this.getMeasureEntryCount(key) - 1) {
      const nextEntry = this.getMeasureEntries(key).at(key.measureEntryIndex + 1);
      util.assertDefined(nextEntry);
      return nextEntry;
    }
    return this.getNextMeasure(key)?.entries.at(0) ?? null;
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

  getPartCount(key: MeasureEntryKey): number {
    return this.getParts(key).length;
  }

  isFirstPart(key: PartKey): boolean {
    return key.partIndex === 0;
  }

  isLastPart(key: PartKey): boolean {
    return key.partIndex === this.getPartCount(key) - 1;
  }

  getPartMultiRestCount(key: PartKey): number {
    return Math.min(...this.getStaves(key).map((s) => s.multiRestCount));
  }

  getPart(key: PartKey): data.Part {
    const part = this.getParts(key).at(key.partIndex);
    util.assertDefined(part);
    return part;
  }

  getStaves(key: PartKey): data.Stave[] {
    return this.getPart(key).staves;
  }

  getStaveCount(key: PartKey): number {
    return this.getPart(key).signature.staveCount;
  }

  isFirstStave(key: StaveKey): boolean {
    return key.staveIndex === 0;
  }

  isLastStave(key: StaveKey): boolean {
    return key.staveIndex === this.getStaveCount(key) - 1;
  }

  getStaveMultiRestCount(key: StaveKey): number {
    return this.getStave(key).multiRestCount;
  }

  getPreviouslyPlayedStave(key: StaveKey): data.Stave | null {
    return this.getPreviousMeasureEntry(key)?.parts.at(key.partIndex)?.staves.at(key.staveIndex) ?? null;
  }

  getStave(key: StaveKey): data.Stave {
    const stave = this.getStaves(key).at(key.staveIndex);
    util.assertDefined(stave);
    return stave;
  }

  getNextPlayedStave(key: StaveKey): data.Stave | null {
    return this.getNextMeasureEntry(key)?.parts.at(key.partIndex)?.staves.at(key.staveIndex) ?? null;
  }

  getVoices(key: StaveKey): data.Voice[] {
    return this.getStave(key).voices;
  }

  getVoiceCount(key: StaveKey): number {
    return this.getVoices(key).length;
  }

  isFirstVoice(key: VoiceKey): boolean {
    return key.voiceIndex === 0;
  }

  isLastVoice(key: VoiceKey): boolean {
    return key.voiceIndex === this.getVoiceCount(key) - 1;
  }

  getVoice(key: VoiceKey): data.Voice {
    const voice = this.getVoices(key).at(key.voiceIndex);
    util.assertDefined(voice);
    return voice;
  }

  getVoiceEntries(key: VoiceKey): data.VoiceEntry[] {
    return this.getVoice(key).entries;
  }

  getVoiceEntryCount(key: VoiceKey): number {
    return this.getVoiceEntries(key).length;
  }

  isFirstVoiceEntry(key: VoiceEntryKey): boolean {
    return key.voiceEntryIndex === 0;
  }

  isLastVoiceEntry(key: VoiceEntryKey): boolean {
    return key.voiceEntryIndex === this.getVoiceEntryCount(key) - 1;
  }

  getVoiceEntry(key: VoiceEntryKey): data.VoiceEntry {
    const entry = this.getVoiceEntries(key).at(key.voiceEntryIndex);
    util.assertDefined(entry);
    return entry;
  }

  getNote(key: VoiceEntryKey): data.Note {
    const entry = this.getVoiceEntries(key).at(key.voiceEntryIndex);
    util.assert(entry?.type === 'note', 'expected entry to be a note');
    return entry;
  }

  getRest(key: VoiceEntryKey): data.Rest {
    const entry = this.getVoiceEntries(key).at(key.voiceEntryIndex);
    util.assert(entry?.type === 'rest', 'expected entry to be a rest');
    return entry;
  }

  /** Returns a new document with the system arrangements applied. */
  reflow(arrangements: SystemArrangement[]): Document {
    const clone = this.clone();

    const measures = this.data.score.systems.flatMap((s) => s.measures);

    clone.data.score.systems = [];

    for (const arrangement of arrangements) {
      const system: data.System = {
        type: 'system',
        measures: new Array<data.Measure>(),
      };

      system.measures = measures.slice(arrangement.from, arrangement.to + 1);

      clone.data.score.systems.push(system);
    }

    return clone;
  }

  withoutPartLabels(): Document {
    const clone = this.clone();
    clone.data.score.partLabels = [];
    return clone;
  }

  private clone(): Document {
    const score = util.deepClone(this.data.score);
    const document = new data.Document(score);
    return new Document(document);
  }
}
