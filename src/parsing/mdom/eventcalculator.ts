import * as mdom from '@stringsync/mdom';
import { Fraction } from '@/util';
import { DYNAMIC_TYPES } from '@/musicxml';
import { Clef } from '@/parsing/musicxml/clef';
import { Key } from '@/parsing/musicxml/key';
import { Time } from '@/parsing/musicxml/time';
import { Note } from '@/parsing/musicxml/note';
import { Rest } from '@/parsing/musicxml/rest';
import { Chord } from '@/parsing/musicxml/chord';
import { StaveCount } from '@/parsing/musicxml/stavecount';
import { StaveLineCount } from '@/parsing/musicxml/stavelinecount';
import { Metronome } from '@/parsing/musicxml/metronome';
import { Dynamics } from '@/parsing/musicxml/dynamics';
import { Wedge } from '@/parsing/musicxml/wedge';
import { Pedal } from '@/parsing/musicxml/pedal';
import { OctaveShift } from '@/parsing/musicxml/octaveshift';
import { ChordSymbol } from '@/parsing/musicxml/chordsymbol';
import { DynamicType } from '@/parsing/musicxml/enums';
import { MeasureEvent } from '@/parsing/musicxml/types';
import { Config } from '@/config';
import { Logger } from '@/debug';

/**
 * Produces the same {@link MeasureEvent} stream that the legacy `EventCalculator` emits, but sourced from an mdom
 * document instead of the `@/musicxml` wrappers. It walks each measure's raw children in document order and replicates
 * the legacy Fraction accumulation (including <backup>/<forward>) so onset/duration representations match exactly.
 */
export class MdomEventCalculator {
  private measureBeat = Fraction.zero();
  private events = new Array<MeasureEvent>();
  private quarterNoteDivisions = 1;

  // partId -> voiceId
  private previousExplicitVoiceId: Record<string, string> = {};
  // partId -> staveNumber
  private previousExplicitStaveNumber: Record<string, number> = {};
  // partId -> staveCount
  private previousExplicitStaveCount: Record<string, number> = {};

  // staveNumber -> Key
  private previousKeys = new Map<number, Key>();

  // Grace notes seen since the last principal note, awaiting attachment to the next principal note/chord.
  private pendingGraces = new Array<mdom.Note>();

  // The most recent <harmony> chord symbol, awaiting attachment to the next eligible note/rest/chord.
  private pendingChordSymbol: ChordSymbol | null = null;

  constructor(private config: Config, private log: Logger, private score: mdom.Score) {}

  calculate(): MeasureEvent[] {
    this.events = [];

    for (const part of this.score.parts) {
      this.quarterNoteDivisions = 1;
      this.previousKeys = new Map<number, Key>();

      const partId = part.getAttribute('id') ?? '';
      const measures = part.measures;

      this.previousExplicitStaveNumber[partId] = 1;
      this.previousExplicitVoiceId[partId] = '1';
      this.previousExplicitStaveCount[partId] = 1;

      for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
        this.measureBeat = Fraction.zero();
        this.pendingGraces = [];
        this.pendingChordSymbol = null;
        const measure = measures[measureIndex];
        const chordLeads = this.getChordLeads(measure);

        for (const node of measure.children) {
          if (node instanceof mdom.MElement) {
            this.process(node, partId, measureIndex, chordLeads);
          }
        }
      }
    }

    return this.events;
  }

  /** Maps each chord lead note (the non-`<chord/>` head) to the full group of notes that sound at its onset. */
  private getChordLeads(measure: mdom.Measure): Map<mdom.Note, mdom.Note[]> {
    const leads = new Map<mdom.Note, mdom.Note[]>();
    for (const chord of measure.chords) {
      leads.set(chord.notes[0], chord.notes);
    }
    return leads;
  }

  private process(
    node: mdom.MElement,
    partId: string,
    measureIndex: number,
    chordLeads: Map<mdom.Note, mdom.Note[]>
  ): void {
    if (node instanceof mdom.Note) {
      this.processNote(node, partId, measureIndex, chordLeads);
    } else if (node.tag === 'backup') {
      this.processBackup(node);
    } else if (node.tag === 'forward') {
      this.processForward(node);
    } else if (node.tag === 'attributes') {
      this.processAttributes(node, partId, measureIndex);
    } else if (node instanceof mdom.Direction) {
      this.processDirection(node, partId, measureIndex);
    } else if (node.tag === 'harmony') {
      // Keep the previous pending symbol when this <harmony> has no <kind> (mirrors `?? pending`).
      this.pendingChordSymbol =
        ChordSymbol.fromMdom(this.config, this.log, { harmony: node }) ?? this.pendingChordSymbol;
    }
  }

  private processNote(
    note: mdom.Note,
    partId: string,
    measureIndex: number,
    chordLeads: Map<mdom.Note, mdom.Note[]>
  ): void {
    const staveNumber = this.resolveStaveNumber(partId, this.rawStaveNumber(note));
    const voiceId = this.resolveVoiceId(partId, this.rawVoice(note));

    // Grace notes (including grace chord members) carry no duration; accumulate them for the next principal note.
    if (note.isGrace) {
      this.pendingGraces.push(note);
      return;
    }

    const quarterNotes = Number(note.child('duration')?.text ?? 0);
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);

    if (note.isChordMember) {
      return;
    }

    const graceNotes = this.pendingGraces;
    this.pendingGraces = [];

    const chordSymbol = this.pendingChordSymbol;
    this.pendingChordSymbol = null;

    const group = chordLeads.get(note);
    if (group && group.length > 1) {
      this.events.push({
        type: 'chord',
        partId,
        measureIndex,
        staveNumber,
        voiceId,
        measureBeat: this.measureBeat,
        duration,
        chord: Chord.fromMdom(
          this.config,
          this.log,
          this.measureBeat,
          duration,
          { notes: group },
          chordSymbol,
          graceNotes
        ),
      });
    } else if (note.isRest) {
      this.events.push({
        type: 'rest',
        partId,
        measureIndex,
        staveNumber,
        voiceId,
        measureBeat: this.measureBeat,
        duration,
        rest: Rest.fromMdom(this.config, this.log, this.measureBeat, duration, { note }, chordSymbol),
      });
    } else {
      this.events.push({
        type: 'note',
        partId,
        measureIndex,
        staveNumber,
        voiceId,
        measureBeat: this.measureBeat,
        duration,
        note: Note.fromMdom(this.config, this.log, this.measureBeat, duration, { note }, chordSymbol, graceNotes),
      });
    }

    this.measureBeat = this.measureBeat.add(duration);
  }

  private processBackup(node: mdom.MElement): void {
    const quarterNotes = Number(node.child('duration')?.text ?? 0);
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);
    this.measureBeat = this.measureBeat.subtract(duration);
    if (this.measureBeat.isLessThan(Fraction.zero())) {
      this.measureBeat = Fraction.zero();
    }
  }

  private processForward(node: mdom.MElement): void {
    const quarterNotes = Number(node.child('duration')?.text ?? 0);
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);
    this.measureBeat = this.measureBeat.add(duration);
  }

  private processAttributes(attributes: mdom.MElement, partId: string, measureIndex: number): void {
    const rawDivisions = attributes.child('divisions')?.text;
    if (typeof rawDivisions === 'string') {
      this.quarterNoteDivisions = parseInt(rawDivisions, 10) || this.quarterNoteDivisions;
    }

    const rawStaves = attributes.child('staves')?.text;
    const explicitStaveCount = typeof rawStaves === 'string' ? parseInt(rawStaves, 10) : null;
    const staveCount = explicitStaveCount ?? this.previousExplicitStaveCount[partId];
    if (explicitStaveCount) {
      this.events.push({
        type: 'stavecount',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveCount: new StaveCount(this.config, this.log, partId, staveCount),
      });
    }

    for (const staveDetails of attributes.childrenNamed('staff-details')) {
      const staveLineCount = StaveLineCount.fromMdom(this.config, this.log, partId, { staveDetails });
      this.events.push({
        type: 'stavelinecount',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber: staveLineCount.getStaveNumber(),
        staveLineCount,
      });
    }

    for (const clefNode of attributes.childrenOfType(mdom.Clef)) {
      const clef = Clef.fromMdom(this.config, this.log, partId, { clef: clefNode });
      this.events.push({
        type: 'clef',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber: clef.getStaveNumber(),
        clef,
      });
    }

    // Keys can apply to a specific stave or to all staves. We track the previous key to know if cancel accidentals are
    // needed.
    for (const keyNode of attributes.childrenOfType(mdom.Key)) {
      const rawNumber = keyNode.getAttribute('number');
      const staveNumber = rawNumber ? parseInt(rawNumber, 10) : null;

      if (typeof staveNumber === 'number') {
        this.resolveStaveNumber(partId, staveNumber);
        const previousKey = this.previousKeys.get(staveNumber) ?? null;
        const key = Key.fromMdom(this.config, this.log, partId, staveNumber, previousKey, { key: keyNode });
        this.previousKeys.set(staveNumber, key);
        this.events.push({ type: 'key', partId, measureIndex, measureBeat: this.measureBeat, staveNumber, key });
      } else {
        for (let index = 0; index < staveCount; index++) {
          const previousKey = this.previousKeys.get(index + 1) ?? null;
          const key = Key.fromMdom(this.config, this.log, partId, index + 1, previousKey, { key: keyNode });
          this.previousKeys.set(index + 1, key);
          this.events.push({
            type: 'key',
            partId,
            measureIndex,
            measureBeat: this.measureBeat,
            staveNumber: index + 1,
            key,
          });
        }
      }
    }

    const times = attributes
      .childrenOfType(mdom.Time)
      .flatMap((timeNode) => {
        const rawNumber = timeNode.getAttribute('number');
        const staveNumber = rawNumber ? parseInt(rawNumber, 10) : null;
        if (typeof staveNumber === 'number') {
          return [
            Time.fromMdom(this.config, this.log, partId, this.resolveStaveNumber(partId, staveNumber), {
              time: timeNode,
            }),
          ];
        } else {
          return Time.fromMdomMulti(this.config, this.log, partId, staveCount, { time: timeNode });
        }
      })
      .filter((time): time is Time => time !== null);
    for (const time of times) {
      this.events.push({
        type: 'time',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber: time.getStaveNumber(),
        time,
      });
    }

    const measureStyle = attributes
      .childrenNamed('measure-style')
      .find((measureStyle) => Number(measureStyle.child('multiple-rest')?.text ?? 0) > 0);
    if (measureStyle) {
      const measureCount = Number(measureStyle.child('multiple-rest')?.text ?? 0);
      const rawNumber = measureStyle.getAttribute('number');
      const staveNumber = rawNumber ? parseInt(rawNumber, 10) : null;
      this.events.push({
        type: 'multirest',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        measureCount,
        staveNumber,
      });
    }
  }

  private processDirection(direction: mdom.Direction, partId: string, measureIndex: number): void {
    const directionTypes = direction.childrenNamed('direction-type');

    const metronomeElement = directionTypes.flatMap((dt) => dt.childrenNamed('metronome')).at(0);
    if (metronomeElement) {
      const metronome = Metronome.fromMdom(this.config, this.log, { metronome: metronomeElement });
      if (metronome) {
        this.events.push({ type: 'metronome', partId, measureIndex, measureBeat: this.measureBeat, metronome });
      }
    }

    if (directionTypes.some((dt) => dt.childrenNamed('segno').length > 0)) {
      this.events.push({ type: 'segno', partId, measureIndex, measureBeat: this.measureBeat });
    }

    if (directionTypes.some((dt) => dt.childrenNamed('coda').length > 0)) {
      this.events.push({ type: 'coda', partId, measureIndex, measureBeat: this.measureBeat });
    }

    const dynamicType = directionTypes
      .flatMap((dt) => dt.childrenNamed('dynamics'))
      .flatMap((dynamics) => dynamics.children.map((child) => (child as mdom.MElement).tag))
      .find((tag) => DYNAMIC_TYPES.includes(tag)) as DynamicType | undefined;
    if (dynamicType) {
      const staveNumber = this.resolveStaveNumber(partId, this.directionStaveNumber(direction));
      const voiceId = this.resolveVoiceId(partId, this.directionVoice(direction));
      this.events.push({
        type: 'dynamics',
        partId,
        measureIndex,
        staveNumber,
        voiceId,
        measureBeat: this.measureBeat,
        dynamics: new Dynamics(this.config, this.log, this.measureBeat, dynamicType),
      });
    }

    const wedge = direction.wedges.at(0);
    if (wedge) {
      const staveNumber = this.resolveStaveNumber(partId, this.directionStaveNumber(direction));
      const voiceId = this.resolveVoiceId(partId, this.directionVoice(direction));
      this.events.push({
        type: 'wedge',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber,
        voiceId,
        wedge: Wedge.fromMdom({ direction, wedge }),
      });
    }

    const pedal = direction.pedals.at(0);
    if (pedal) {
      const staveNumber = this.resolveStaveNumber(partId, this.directionStaveNumber(direction));
      const voiceId = this.resolveVoiceId(partId, this.directionVoice(direction));
      this.events.push({
        type: 'pedal',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber,
        voiceId,
        pedal: Pedal.fromMdom(this.config, this.log, { pedal }),
      });
    }

    const octaveShift = direction.octaveShifts.at(0);
    if (octaveShift) {
      const staveNumber = this.resolveStaveNumber(partId, this.directionStaveNumber(direction));
      const voiceId = this.resolveVoiceId(partId, this.directionVoice(direction));
      this.events.push({
        type: 'octaveshift',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber,
        voiceId,
        octaveShift: OctaveShift.fromMdom(this.config, this.log, { octaveShift }),
      });
    }
  }

  private directionStaveNumber(direction: mdom.Direction): number | null {
    const raw = direction.child('staff')?.text;
    return typeof raw === 'string' ? parseInt(raw, 10) : null;
  }

  private directionVoice(direction: mdom.Direction): string | null {
    return direction.child('voice')?.text ?? null;
  }

  private rawStaveNumber(note: mdom.Note): number | null {
    const raw = note.child('staff')?.text;
    return typeof raw === 'string' ? parseInt(raw, 10) : null;
  }

  private rawVoice(note: mdom.Note): string | null {
    return note.child('voice')?.text ?? null;
  }

  private resolveVoiceId(partId: string, voiceId: string | null): string {
    return (this.previousExplicitVoiceId[partId] = voiceId ?? this.previousExplicitVoiceId[partId]);
  }

  private resolveStaveNumber(partId: string, staveNumber: number | null): number {
    return (this.previousExplicitStaveNumber[partId] = staveNumber ?? this.previousExplicitStaveNumber[partId]);
  }
}
