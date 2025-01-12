import * as data from '@/data';
import * as util from '@/util';
import {
  SystemKey,
  MeasureKey,
  FragmentKey,
  PartKey,
  StaveKey,
  VoiceKey,
  VoiceEntryKey,
  SystemArrangement,
  PartLabelKey,
  CurveKey,
  BeamKey,
  TupletKey,
  WedgeKey,
  PedalKey,
  OctaveShiftKey,
  VibratoKey,
  ArticulationKey,
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

  getCurves(): data.Curve[] {
    return this.data.score.curves;
  }

  getCurve(key: CurveKey): data.Curve {
    const curve = this.getCurves().at(key.curveIndex);
    util.assertDefined(curve);
    return curve;
  }

  getWedges(): data.Wedge[] {
    return this.data.score.wedges;
  }

  getWedge(key: WedgeKey): data.Wedge {
    const wedge = this.getWedges().at(key.wedgeIndex);
    util.assertDefined(wedge);
    return wedge;
  }

  getPedals(): data.Pedal[] {
    return this.data.score.pedals;
  }

  getPedal(key: PedalKey): data.Pedal {
    const pedal = this.getPedals().at(key.pedalIndex);
    util.assertDefined(pedal);
    return pedal;
  }

  getOctaveShifts(): data.OctaveShift[] {
    return this.data.score.octaveShifts;
  }

  getOctaveShift(key: OctaveShiftKey): data.OctaveShift {
    const octaveShift = this.getOctaveShifts().at(key.octaveShiftIndex);
    util.assertDefined(octaveShift);
    return octaveShift;
  }

  getOctaveShiftKey(id: string): OctaveShiftKey {
    const octaveShift = this.data.score.octaveShifts.find((o) => o.id === id);
    util.assertDefined(octaveShift);
    return { octaveShiftIndex: this.data.score.octaveShifts.indexOf(octaveShift) };
  }

  getVibratos(): data.Vibrato[] {
    return this.data.score.vibratos;
  }

  getVibrato(key: VibratoKey): data.Vibrato {
    const vibrato = this.getVibratos().at(key.vibratoIndex);
    util.assertDefined(vibrato);
    return vibrato;
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

  getMeasureMultiRestCount(key: MeasureKey): number {
    let measureMultiRestCount = -1;

    const fragmentCount = this.getFragmentCount(key);
    for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex++) {
      const fragmentKey: FragmentKey = { ...key, fragmentIndex };

      const partCount = this.getPartCount(fragmentKey);
      for (let partIndex = 0; partIndex < partCount; partIndex++) {
        const partKey: PartKey = { ...fragmentKey, partIndex };

        const staveCount = this.getStaveCount(partKey);
        for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
          const staveKey: StaveKey = { ...partKey, staveIndex };

          if (measureMultiRestCount === -1) {
            measureMultiRestCount = this.getStaveMultiRestCount(staveKey);
          } else {
            measureMultiRestCount = Math.min(measureMultiRestCount, this.getStaveMultiRestCount(staveKey));
          }
        }
      }
    }

    return Math.max(0, measureMultiRestCount);
  }

  getAbsoluteMeasureIndex(key: MeasureKey): number {
    const measures = this.getSystems().flatMap((s) => s.measures);
    return measures.indexOf(this.getMeasure(key));
  }

  getJumps(key: MeasureKey): data.Jump[] {
    return this.getMeasure(key).jumpGroup.jumps;
  }

  getFragments(key: MeasureKey): data.Fragment[] {
    return this.getMeasure(key).fragments;
  }

  getFragmentCount(key: MeasureKey): number {
    return this.getFragments(key).length;
  }

  isFirstFragment(key: FragmentKey): boolean {
    return key.fragmentIndex === 0;
  }

  isLastFragment(key: FragmentKey): boolean {
    return key.fragmentIndex === this.getFragmentCount(key) - 1;
  }

  getPreviousFragment(key: FragmentKey): data.Fragment | null {
    if (key.fragmentIndex > 0) {
      const previousEntry = this.getFragments(key).at(key.fragmentIndex - 1);
      util.assertDefined(previousEntry);
      return previousEntry;
    }
    return this.getPreviousMeasure(key)?.fragments.at(-1) ?? null;
  }

  getFragment(key: FragmentKey): data.Fragment {
    const entry = this.getFragments(key).at(key.fragmentIndex);
    util.assertDefined(entry);
    return entry;
  }

  getNextFragment(key: FragmentKey): data.Fragment | null {
    if (key.fragmentIndex < this.getFragmentCount(key) - 1) {
      const nextEntry = this.getFragments(key).at(key.fragmentIndex + 1);
      util.assertDefined(nextEntry);
      return nextEntry;
    }
    return this.getNextMeasure(key)?.fragments.at(0) ?? null;
  }

  getParts(key: FragmentKey): data.Part[] {
    return this.getFragment(key).parts;
  }

  getPartCount(key: FragmentKey): number {
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

  isTabStave(key: StaveKey): boolean {
    return this.getStave(key).signature.clef.sign === 'tab';
  }

  getStaveMultiRestCount(key: StaveKey): number {
    return this.getStave(key).multiRestCount;
  }

  getPreviouslyPlayedStave(key: StaveKey): data.Stave | null {
    return this.getPreviousFragment(key)?.parts.at(key.partIndex)?.staves.at(key.staveIndex) ?? null;
  }

  getStave(key: StaveKey): data.Stave {
    const stave = this.getStaves(key).at(key.staveIndex);
    util.assertDefined(stave);
    return stave;
  }

  getNextPlayedStave(key: StaveKey): data.Stave | null {
    return this.getNextFragment(key)?.parts.at(key.partIndex)?.staves.at(key.staveIndex) ?? null;
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

  getBeams(key: VoiceKey): data.Beam[] {
    return this.getVoice(key).beams;
  }

  getBeamCount(key: VoiceKey): number {
    return this.getBeams(key).length;
  }

  getBeam(key: BeamKey): data.Beam {
    const beam = this.getBeams(key).at(key.beamIndex);
    util.assertDefined(beam);
    return beam;
  }

  getTuplets(key: VoiceKey): data.Tuplet[] {
    return this.getVoice(key).tuplets;
  }

  getTupletCount(key: VoiceKey): number {
    return this.getTuplets(key).length;
  }

  getTuplet(key: TupletKey): data.Tuplet {
    const tuplet = this.getTuplets(key).at(key.tupletIndex);
    util.assertDefined(tuplet);
    return tuplet;
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

  getChord(key: VoiceEntryKey): data.Chord {
    const entry = this.getVoiceEntries(key).at(key.voiceEntryIndex);
    util.assert(entry?.type === 'chord', 'expected entry to be a chord');
    return entry;
  }

  getDynamics(key: VoiceEntryKey): data.Dynamics {
    const entry = this.getVoiceEntries(key).at(key.voiceEntryIndex);
    util.assert(entry?.type === 'dynamics', 'expected entry to be dynamics');
    return entry;
  }

  getArticulations(key: VoiceEntryKey): data.Articulation[] {
    const entry = this.getVoiceEntries(key).at(key.voiceEntryIndex);
    util.assert(entry?.type === 'note' || entry?.type === 'chord', 'expected entry to be a note or chord');
    return entry.articulations;
  }

  getArticulation(key: ArticulationKey): data.Articulation {
    const articulation = this.getArticulations(key).at(key.articulationIndex);
    util.assertDefined(articulation);
    return articulation;
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
