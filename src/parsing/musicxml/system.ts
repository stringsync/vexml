import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Measure } from './measure';
import { Fraction } from '@/util';
import { MeasureEvent } from './types';
import { Signature } from './signature';
import { StaveCount } from './stavecount';
import { StaveLineCount } from './stavelinecount';
import { Clef } from './clef';
import { Key } from './key';
import { Time } from './time';
import { Metronome } from './metronome';
import { Note } from './note';
import { Rest } from './rest';
import { SystemContext } from './contexts';

export class System {
  constructor(private musicXML: { scorePartwise: musicxml.ScorePartwise }) {}

  parse(): data.System {
    const systemCtx = new SystemContext();

    const parsedMeasures = new Array<data.Measure>();

    for (const measure of this.getMeasures()) {
      const multiRestEvents = measure.getEvents().filter((event) => event.type === 'multirest');
      for (const multiRestEvent of multiRestEvents) {
        systemCtx.incrementMultiRestCount(
          multiRestEvent.partId,
          multiRestEvent.staveNumber,
          multiRestEvent.measureCount
        );
      }

      const parsedMeasure = measure.parse(systemCtx);
      parsedMeasures.push(parsedMeasure);

      systemCtx.decrementMultiRestCounts();
    }

    return {
      type: 'system',
      measures: parsedMeasures,
    };
  }

  private getMeasures(): Measure[] {
    const partIds = this.getPartIds();

    const measureCount = this.getMeasureCount();
    const measureLabels = this.getMeasureLabels(measureCount);
    const measureEvents = this.getMeasureEvents();

    const measures = new Array<Measure>(measureCount);

    let signature = Signature.default();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureLabel = measureLabels[measureIndex];
      const measure = new Measure(
        signature,
        measureIndex,
        measureLabel,
        measureEvents.filter((event) => event.measureIndex === measureIndex),
        partIds
      );
      measures[measureIndex] = measure;
      signature = measure.getLastSignature();
    }

    return measures;
  }

  private getPartIds(): string[] {
    return this.musicXML.scorePartwise.getParts().map((part) => part.getId());
  }

  private getMeasureCount() {
    return util.max(this.musicXML.scorePartwise.getParts().map((part) => part.getMeasures().length));
  }

  private getMeasureLabels(measureCount: number): number[] {
    const measureLabels = new Array<number>(measureCount).fill(1);

    const part = util.first(this.musicXML.scorePartwise.getParts());
    if (!part) {
      return measureLabels;
    }

    const measures = part.getMeasures();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measure = measures[measureIndex];
      if (measure.isImplicit()) {
        continue;
      }

      const number = parseInt(measure.getNumber(), 10);
      if (Number.isInteger(number) && !Number.isNaN(number)) {
        measureLabels[measureIndex] = number;
      } else {
        measureLabels[measureIndex] = measureIndex + 1;
      }
    }

    return measureLabels;
  }

  private getMeasureEvents(): MeasureEvent[] {
    return new MeasureEventCalculator({ scorePartwise: this.musicXML.scorePartwise }).calculate();
  }
}

class MeasureEventCalculator {
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

    return util.sortBy(this.events, (event) => event.measureBeat.toDecimal());
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

    if (note.isRest()) {
      this.events.push({
        type: 'rest',
        partId,
        measureIndex,
        staveNumber,
        voiceId,
        measureBeat: this.measureBeat,
        duration,
        rest: Rest.fromMusicXML(this.measureBeat, duration, { note }),
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
        note: Note.fromMusicXML(this.measureBeat, duration, { note }),
      });
    }

    this.measureBeat = this.measureBeat.add(duration);
  }

  private processBackup(backup: musicxml.Backup): void {
    const quarterNotes = backup.getDuration();
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);
    this.measureBeat = this.measureBeat.subtract(duration);
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
      .map((staveDetails) => StaveLineCount.fromMusicXML(partId, { staveDetails }));
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
      .map((time) => Time.fromMusicXML(partId, { time }))
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
        metronome: Metronome.fromMusicXML({ metronome, mark }),
      });
    }
  }
}
