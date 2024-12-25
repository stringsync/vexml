import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { Fraction } from '@/util';
import { StaveSignature } from './stavesignature';

/**
 * MeasureEvent is an intermediate data structure that accounts for the duration of each event.
 *
 * It's a transformation of {@link musicxml.MeasureEntry} that inherently accounts for the {@link musicxml.Forward} and
 * {@link musicxml.Backup} elements.
 */
export type MeasureEvent =
  | {
      type: 'note';
      at: Fraction;
      duration: Fraction;
      note: musicxml.Note;
      partId: string;
      staveNumber: number;
      voiceId: string;
    }
  | {
      type: 'direction';
      at: Fraction;
      direction: musicxml.Direction;
      partId: string;
      staveNumber: number | null;
      voiceId: string | null;
    }
  | {
      type: 'stavesignature';
      at: Fraction;
      staveSignature: data.StaveSignature;
    };

/** MeasureEventTracker is a parser helper that incrementally tracks measure events. */
export class MeasureEventTracker {
  private start = Fraction.zero();
  private events = new Array<MeasureEvent>();

  constructor(private staveSignature: StaveSignature) {}

  /** Returns the events that were collected, sorted by start. */
  getEvents(): MeasureEvent[] {
    return this.events.toSorted((a, b) => a.at.toDecimal() - b.at.toDecimal());
  }

  /** Processes the measure entry, storing any events that occured. */
  update(entry: musicxml.MeasureEntry, part: musicxml.Part): void {
    if (entry instanceof musicxml.Note) {
      this.onNote(entry, part);
    }

    if (entry instanceof musicxml.Backup) {
      this.onBackup(entry, part);
    }

    if (entry instanceof musicxml.Forward) {
      this.onForward(entry, part);
    }

    if (entry instanceof musicxml.Attributes) {
      this.onAttributes(entry, part);
    }

    if (entry instanceof musicxml.Direction) {
      this.onDirection(entry, part);
    }
  }

  private onNote(note: musicxml.Note, part: musicxml.Part): void {
    if (note.isChordTail()) {
      return;
    }

    const partId = part.getId();
    const voiceId = note.getVoice();
    const staveNumber = note.getStaveNumber();

    const quarterNotes = note.isGrace() ? 0 : note.getDuration();
    const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions(partId);
    const duration = new Fraction(quarterNotes, quarterNoteDivisions);

    this.events.push({ type: 'note', at: this.start, duration, note, partId, staveNumber, voiceId });

    this.start = this.start.add(duration);
  }

  private onBackup(backup: musicxml.Backup, part: musicxml.Part): void {
    const quarterNotes = backup.getDuration();
    const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions(part.getId());
    const duration = new Fraction(quarterNotes, quarterNoteDivisions);

    this.start = this.start.subtract(duration);
  }

  private onForward(forward: musicxml.Forward, part: musicxml.Part): void {
    const quarterNotes = forward.getDuration();
    const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions(part.getId());
    const duration = new Fraction(quarterNotes, quarterNoteDivisions);

    this.start = this.start.add(duration);
  }

  private onAttributes(attributes: musicxml.Attributes, part: musicxml.Part): void {
    const partId = part.getId();
    this.staveSignature = this.staveSignature.updateWithAttributes(partId, { attributes });
    this.events.push({ type: 'stavesignature', at: this.start, staveSignature: this.staveSignature.asData() });
  }

  private onDirection(direction: musicxml.Direction, part: musicxml.Part): void {
    const metronome = direction.getMetronome();
    const metronomeMark = metronome?.getMark();
    if (metronome && metronomeMark) {
      this.staveSignature = this.staveSignature.updateWithMetronome({ metronome, metronomeMark });
      this.events.push({ type: 'stavesignature', at: this.start, staveSignature: this.staveSignature.asData() });
    }

    const partId = part.getId();
    const voiceId = direction.getVoice();
    const staveNumber = direction.getStaveNumber();
    this.events.push({ type: 'direction', at: this.start, direction, partId, staveNumber, voiceId });
  }
}
