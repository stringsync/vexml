import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Measure } from './measure';
import { Fraction } from '@/util';
import { MeasureEvent } from './types';
import { Signature } from './signature';

export class System {
  constructor(private musicXML: { scorePartwise: musicxml.ScorePartwise }) {}

  getMeasures(): Measure[] {
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

  private getMeasureLabels(measureCount: number): string[] {
    const measureLabels = new Array<string>(measureCount).fill('');

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
        measureLabels[measureIndex] = number.toString();
      } else {
        measureLabels[measureIndex] = (measureIndex + 1).toString();
      }
    }

    return measureLabels;
  }

  private getMeasureEvents(): MeasureEvent[] {
    return new MeasureEventCalculator({ scorePartwise: this.musicXML.scorePartwise }).calculate();
  }
}

class MeasureEventCalculator {
  private beat = Fraction.zero();
  private events = new Array<MeasureEvent>();
  private quarterNoteDivisions = 1;

  constructor(private musicXML: { scorePartwise: musicxml.ScorePartwise }) {}

  calculate(): MeasureEvent[] {
    this.events = [];

    for (const part of this.musicXML.scorePartwise.getParts()) {
      this.quarterNoteDivisions = 1;

      const partId = part.getId();
      const measures = part.getMeasures();

      for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
        this.beat = Fraction.zero();

        for (const entry of measures[measureIndex].getEntries()) {
          this.process(entry, partId, measureIndex);
        }
      }
    }

    return util.sortBy(this.events, (event) => event.beat.toDecimal());
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

    if (!note.isChordTail()) {
      return;
    }

    this.events.push({ type: 'note', partId, measureIndex, staveNumber, voiceId, beat: this.beat, musicXML: { note } });

    this.beat = this.beat.add(duration);
  }

  private processBackup(backup: musicxml.Backup): void {
    const quarterNotes = backup.getDuration();
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);
    this.beat = this.beat.subtract(duration);
  }

  private processForward(forward: musicxml.Forward): void {
    const quarterNotes = forward.getDuration();
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);
    this.beat = this.beat.add(duration);
  }

  private processAttributes(attributes: musicxml.Attributes, partId: string, measureIndex: number): void {
    this.events.push({ type: 'attributes', partId, measureIndex, beat: this.beat, musicXML: { attributes } });
  }

  private processDirection(direction: musicxml.Direction, partId: string, measureIndex: number): void {
    const metronome = direction.getMetronome();
    if (metronome) {
      this.events.push({ type: 'metronome', partId, measureIndex, beat: this.beat, musicXML: { metronome } });
    }
  }
}
