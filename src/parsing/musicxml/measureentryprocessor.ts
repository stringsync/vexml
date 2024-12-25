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
      type: 'stavesignature';
      at: Fraction;
      staveSignature: data.StaveSignature;
    }
  | {
      // TODO: Once parsing spans are established, figure out the extra data needed.
      type: 'octaveshift';
      at: Fraction;
      octaveShift: musicxml.OctaveShift;
      partId: string;
    }
  | {
      type: 'dynamics';
      at: Fraction;
      dynamics: musicxml.Dynamics;
      partId: string;
      placement: musicxml.AboveBelow;
    };

/** MeasureEntryProcessor is a helper that incrementally tracks measure events for a given part. */
export class MeasureEntryProcessor {
  private start = Fraction.zero();
  private events = new Array<MeasureEvent>();

  constructor(private partId: string, private staveSignature: StaveSignature) {}

  /** Returns the events that were collected, sorted by start. */
  getEvents(): MeasureEvent[] {
    return this.events.toSorted((a, b) => a.at.toDecimal() - b.at.toDecimal());
  }

  /** Processes the measure entry, storing any events that occured. */
  process(entry: musicxml.MeasureEntry): void {
    if (entry instanceof musicxml.Note) {
      this.onNote(entry);
    }

    if (entry instanceof musicxml.Backup) {
      this.onBackup(entry);
    }

    if (entry instanceof musicxml.Forward) {
      this.onForward(entry);
    }

    if (entry instanceof musicxml.Attributes) {
      this.onAttributes(entry);
    }

    if (entry instanceof musicxml.Direction) {
      this.onDirection(entry);
    }
  }

  private onNote(note: musicxml.Note): void {
    if (note.isChordTail()) {
      return;
    }

    const voiceId = note.getVoice();
    const staveNumber = note.getStaveNumber();

    const quarterNotes = note.isGrace() ? 0 : note.getDuration();
    const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions(this.partId);
    const duration = new Fraction(quarterNotes, quarterNoteDivisions);

    this.events.push({ type: 'note', at: this.start, duration, note, partId: this.partId, staveNumber, voiceId });

    this.start = this.start.add(duration);
  }

  private onBackup(backup: musicxml.Backup): void {
    const quarterNotes = backup.getDuration();
    const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions(this.partId);
    const duration = new Fraction(quarterNotes, quarterNoteDivisions);

    this.start = this.start.subtract(duration);
  }

  private onForward(forward: musicxml.Forward): void {
    const quarterNotes = forward.getDuration();
    const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions(this.partId);
    const duration = new Fraction(quarterNotes, quarterNoteDivisions);

    this.start = this.start.add(duration);
  }

  private onAttributes(attributes: musicxml.Attributes): void {
    this.staveSignature = this.staveSignature.updateWithAttributes(this.partId, { attributes });
    this.events.push({ type: 'stavesignature', at: this.start, staveSignature: this.staveSignature.asData() });
  }

  private onDirection(direction: musicxml.Direction): void {
    const metronome = direction.getMetronome();
    const metronomeMark = metronome?.getMark();
    if (metronome && metronomeMark) {
      this.staveSignature = this.staveSignature.updateWithMetronome({ metronome, metronomeMark });
      this.events.push({ type: 'stavesignature', at: this.start, staveSignature: this.staveSignature.asData() });
    }

    // TODO: Support multiple simultaneous octave shifts.
    const octaveShift = direction.getOctaveShifts().at(0);
    if (octaveShift) {
      this.events.push({ type: 'octaveshift', at: this.start, octaveShift, partId: this.partId });
    }

    // We only support one dynamic per part.
    const dynamics = direction.getDynamics().at(0);
    if (dynamics) {
      const placement = direction.getPlacement() ?? 'above';
      this.events.push({ type: 'dynamics', at: this.start, dynamics, partId: this.partId, placement });
    }
  }
}
