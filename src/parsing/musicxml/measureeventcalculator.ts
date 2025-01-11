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

export class MeasureEventCalculator {
  private measureBeat = Fraction.zero();
  private events = new Array<MeasureEvent>();
  private quarterNoteDivisions = 1;

  // staveNumber -> Key
  private previousKeys = new Map<number, Key>();

  constructor(private musicXML: { scorePartwise: musicxml.ScorePartwise }) {}

  calculate(): MeasureEvent[] {
    this.events = [];

    for (const part of this.musicXML.scorePartwise.getParts()) {
      this.quarterNoteDivisions = 1;
      this.previousKeys = new Map<number, Key>();

      const partId = part.getId();
      const measures = part.getMeasures();

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
    const staveNumber = note.getStaveNumber();
    const voiceId = note.getVoice();
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
        chord: Chord.create(this.measureBeat, duration, { note }),
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
        rest: Rest.create(this.measureBeat, duration, { note }),
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
        note: Note.create(this.measureBeat, duration, { note }),
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

    const staveCount = new StaveCount(partId, attributes.getStaveCount() ?? 1);
    this.events.push({
      type: 'stavecount',
      partId,
      measureIndex,
      measureBeat: this.measureBeat,
      staveCount,
    });

    const staveLineCounts = attributes
      .getStaveDetails()
      .map((staveDetails) => StaveLineCount.create(partId, { staveDetails }));
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

    const clefs = attributes.getClefs().map((clef) => Clef.fromMusicXML(partId, { clef }));
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

    for (const attributeKey of attributes.getKeys()) {
      const staveNumber = attributeKey.getStaveNumber();
      const previousKey = this.previousKeys.get(staveNumber) ?? null;
      const key = Key.fromMusicXML(partId, previousKey, { key: attributeKey });
      this.previousKeys.set(staveNumber, key);
      this.events.push({
        type: 'key',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber,
        key,
      });
    }

    const times = attributes
      .getTimes()
      .flatMap((time) => {
        const staveNumber = time.getStaveNumber();
        if (typeof staveNumber === 'number') {
          return Time.create(partId, staveNumber, { time });
        } else {
          // A null stave number implies to apply to all staves.
          // See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/#:~:text=the%20entire%20document.-,number,-staff%2Dnumber
          const times = new Array<Time | null>();
          for (let staveNumber = 1; staveNumber <= staveCount.getValue(); staveNumber++) {
            times.push(Time.create(partId, staveNumber, { time }));
          }
          return times;
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
        metronome: Metronome.create({ metronome, mark }),
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
      this.events.push({
        type: 'dynamics',
        partId,
        measureIndex,
        staveNumber: direction.getStaveNumber() ?? 1,
        voiceId: direction.getVoice() ?? '1',
        measureBeat: this.measureBeat,
        dynamics: new Dynamics(this.measureBeat, dynamicType),
      });
    }

    const wedge = direction
      .getWedges()
      .map((wedge) => Wedge.create({ direction, wedge }))
      .at(0);
    if (wedge) {
      this.events.push({
        type: 'wedge',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber: direction.getStaveNumber() ?? 1,
        voiceId: direction.getVoice() ?? '1',
        wedge,
      });
    }

    const pedal = direction
      .getPedals()
      .map((pedal) => Pedal.create({ pedal }))
      .at(0);
    if (pedal) {
      this.events.push({
        type: 'pedal',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber: direction.getStaveNumber() ?? 1,
        voiceId: direction.getVoice() ?? '1',
        pedal,
      });
    }

    const octaveShift = direction
      .getOctaveShifts()
      .map((octaveShift) => OctaveShift.create({ octaveShift }))
      .at(0);
    if (octaveShift) {
      this.events.push({
        type: 'octaveshift',
        partId,
        measureIndex,
        measureBeat: this.measureBeat,
        staveNumber: direction.getStaveNumber() ?? 1,
        voiceId: direction.getVoice() ?? '1',
        octaveShift,
      });
    }
  }
}
