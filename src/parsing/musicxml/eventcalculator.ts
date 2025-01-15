import * as musicxml from '@/musicxml';
import { Fraction } from '@/util';
import { StaveCount } from './stavecount';
import { StaveLineCount } from './stavelinecount';
import { Clef } from './clef';
import { Key } from './key';
import { Time } from './time';
import { Metronome } from './metronome';
import { Note } from './note';
import { Rest } from './rest';
import { MeasureEvent } from './types';
import { Chord } from './chord';
import { Dynamics } from './dynamics';
import { Wedge } from './wedge';
import { Pedal } from './pedal';
import { OctaveShift } from './octaveshift';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class EventCalculator {
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

  constructor(
    private config: Config,
    private log: Logger,
    private musicXML: { scorePartwise: musicxml.ScorePartwise }
  ) {}

  calculate(): MeasureEvent[] {
    this.events = [];

    for (const part of this.musicXML.scorePartwise.getParts()) {
      this.quarterNoteDivisions = 1;
      this.previousKeys = new Map<number, Key>();

      const partId = part.getId();
      const measures = part.getMeasures();

      this.previousExplicitStaveNumber[partId] = 1;
      this.previousExplicitVoiceId[partId] = '1';
      this.previousExplicitStaveCount[partId] = 1;

      for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
        this.measureBeat = Fraction.zero();

        for (const entry of measures[measureIndex].getEntries()) {
          this.process(entry, partId, measureIndex);
        }
      }
    }

    return this.events;
  }

  private process(entry: musicxml.MeasureEntry, partId: string, measureIndex: number): void {
    if (entry instanceof musicxml.Note) {
      this.processNote(entry, partId, measureIndex);
    }

    if (entry instanceof musicxml.Backup) {
      this.processBackup(entry);
    }

    if (entry instanceof musicxml.Forward) {
      this.processForward(entry);
    }

    if (entry instanceof musicxml.Attributes) {
      this.processAttributes(entry, partId, measureIndex);
    }

    if (entry instanceof musicxml.Direction) {
      this.processDirection(entry, partId, measureIndex);
    }
  }

  private processNote(note: musicxml.Note, partId: string, measureIndex: number): void {
    const staveNumber = this.resolveStaveNumber(partId, note.getStaveNumber());
    const voiceId = this.resolveVoiceId(partId, note.getVoice());

    const quarterNotes = note.getDuration();
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);

    if (note.isChordTail()) {
      return;
    }
    if (note.isGrace()) {
      return;
    }
    if (note.isChordHead()) {
      this.events.push({
        type: 'chord',
        partId,
        measureIndex,
        staveNumber,
        voiceId,
        measureBeat: this.measureBeat,
        duration,
        chord: Chord.create(this.config, this.log, this.measureBeat, duration, { note }),
      });
    } else if (note.isRest()) {
      this.events.push({
        type: 'rest',
        partId,
        measureIndex,
        staveNumber,
        voiceId,
        measureBeat: this.measureBeat,
        duration,
        rest: Rest.create(this.config, this.log, this.measureBeat, duration, { note }),
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
        note: Note.create(this.config, this.log, this.measureBeat, duration, { note }),
      });
    }

    this.measureBeat = this.measureBeat.add(duration);
  }

  private processBackup(backup: musicxml.Backup): void {
    const quarterNotes = backup.getDuration();
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);
    this.measureBeat = this.measureBeat.subtract(duration);
    if (this.measureBeat.isLessThan(Fraction.zero())) {
      this.measureBeat = Fraction.zero();
    }
  }

  private processForward(forward: musicxml.Forward): void {
    const quarterNotes = forward.getDuration();
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);
    this.measureBeat = this.measureBeat.add(duration);
  }

  private processAttributes(attributes: musicxml.Attributes, partId: string, measureIndex: number): void {
    this.quarterNoteDivisions = attributes.getQuarterNoteDivisions() ?? this.quarterNoteDivisions;

    const staveCount = attributes.getStaveCount() ?? this.previousExplicitStaveCount[partId];
    if (attributes.getStaveCount()) {
      this.events.push({
        type: 'stavecount',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveCount: new StaveCount(this.config, this.log, partId, staveCount),
      });
    }

    const staveLineCounts = attributes
      .getStaveDetails()
      .map((staveDetails) => StaveLineCount.create(this.config, this.log, partId, { staveDetails }));
    for (const staveLineCount of staveLineCounts) {
      this.events.push({
        type: 'stavelinecount',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber: staveLineCount.getStaveNumber(),
        staveLineCount,
      });
    }

    const clefs = attributes.getClefs().map((clef) => Clef.create(this.config, this.log, partId, { clef }));
    for (const clef of clefs) {
      this.events.push({
        type: 'clef',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber: clef.getStaveNumber(),
        clef,
      });
    }

    // Processing keys is particularly messy because they can be applied to a specific stave or all staves. We need to
    // keep track of the previous key to know if we need to show cancel accidentals.
    for (const attributeKey of attributes.getKeys()) {
      const staveNumber = attributeKey.getStaveNumber();

      if (typeof staveNumber === 'number') {
        // If the key is applied to a specific stave, proceed forward as normal.
        this.resolveStaveNumber(partId, staveNumber);
        const previousKey = this.previousKeys.get(staveNumber) ?? null;
        const key = Key.create(this.config, this.log, partId, staveNumber, previousKey, { key: attributeKey });
        this.previousKeys.set(staveNumber, key);
        this.events.push({
          type: 'key',
          partId,
          measureIndex,
          measureBeat: this.measureBeat,
          staveNumber,
          key,
        });
      } else {
        // Otherwise, apply the key to all staves, checking the previous key as we go along.
        for (let index = 0; index < staveCount; index++) {
          const previousKey = this.previousKeys.get(index + 1) ?? null;
          const key = Key.create(this.config, this.log, partId, index + 1, previousKey, { key: attributeKey });
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
      .getTimes()
      .flatMap((time) => {
        const staveNumber = time.getStaveNumber();
        if (typeof staveNumber === 'number') {
          return [Time.create(this.config, this.log, partId, this.resolveStaveNumber(partId, staveNumber), { time })];
        } else {
          return Time.createMulti(this.config, this.log, partId, staveCount, { time });
        }
      })
      .filter((time) => time !== null);
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

    const measureStyle = attributes.getMeasureStyles().find((measureStyle) => measureStyle.getMultipleRestCount() > 0);
    if (measureStyle) {
      this.events.push({
        type: 'multirest',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        measureCount: measureStyle.getMultipleRestCount(),
        staveNumber: measureStyle.getStaveNumber(),
      });
    }
  }

  private processDirection(direction: musicxml.Direction, partId: string, measureIndex: number): void {
    const metronome = direction.getMetronome();
    const mark = metronome?.getMark();
    if (metronome && mark) {
      this.events.push({
        type: 'metronome',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        metronome: Metronome.create(this.config, this.log, { metronome, mark }),
      });
    }

    const segnos = direction.getSegnos();
    if (segnos.length > 0) {
      this.events.push({
        type: 'segno',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
      });
    }

    const coda = direction.getCodas();
    if (coda.length > 0) {
      this.events.push({
        type: 'coda',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
      });
    }

    const dynamicType = direction
      .getDynamics()
      .flatMap((d) => d.getTypes())
      .at(0);
    if (dynamicType) {
      const staveNumber = this.resolveStaveNumber(partId, direction.getStaveNumber());
      const voiceId = this.resolveVoiceId(partId, direction.getVoice());

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

    const wedge = direction
      .getWedges()
      .map((wedge) => Wedge.create({ direction, wedge }))
      .at(0);
    if (wedge) {
      const staveNumber = this.resolveStaveNumber(partId, direction.getStaveNumber());
      const voiceId = this.resolveVoiceId(partId, direction.getVoice());

      this.events.push({
        type: 'wedge',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber,
        voiceId,
        wedge,
      });
    }

    const pedal = direction
      .getPedals()
      .map((pedal) => Pedal.create(this.config, this.log, { pedal }))
      .at(0);
    if (pedal) {
      const staveNumber = this.resolveStaveNumber(partId, direction.getStaveNumber());
      const voiceId = this.resolveVoiceId(partId, direction.getVoice());

      this.events.push({
        type: 'pedal',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber,
        voiceId,
        pedal,
      });
    }

    const octaveShift = direction
      .getOctaveShifts()
      .map((octaveShift) => OctaveShift.create(this.config, this.log, { octaveShift }))
      .at(0);
    if (octaveShift) {
      const staveNumber = this.resolveStaveNumber(partId, direction.getStaveNumber());
      const voiceId = this.resolveVoiceId(partId, direction.getVoice());

      this.events.push({
        type: 'octaveshift',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber,
        voiceId,
        octaveShift,
      });
    }
  }

  private resolveVoiceId(partId: string, voiceId: string | null): string {
    return (this.previousExplicitVoiceId[partId] = voiceId ?? this.previousExplicitVoiceId[partId]);
  }

  private resolveStaveNumber(partId: string, staveNumber: number | null): number {
    return (this.previousExplicitStaveNumber[partId] = staveNumber ?? this.previousExplicitStaveNumber[partId]);
  }
}
