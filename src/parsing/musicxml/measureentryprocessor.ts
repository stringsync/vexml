import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { Fraction } from '@/util';
import { FragmentSignature } from './fragmentsignature';

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
      signature: data.FragmentSignature;
      measureIndex: number;
      partId: string;
      staveNumber: number;
      voiceId: string;
    }
  | {
      type: 'signature';
      at: Fraction;
      measureIndex: number;
      signature: data.FragmentSignature;
    }
  | {
      // TODO: Once parsing spans are established, figure out the extra data needed.
      type: 'octaveshift';
      at: Fraction;
      octaveShift: musicxml.OctaveShift;
      measureIndex: number;
      partId: string;
    }
  | {
      type: 'dynamics';
      at: Fraction;
      dynamics: musicxml.Dynamics;
      measureIndex: number;
      partId: string;
      placement: musicxml.AboveBelow;
    };

/** MeasureEntryProcessor is a helper that incrementally tracks measure events for a given part. */
export class MeasureEntryProcessor {
  private at = Fraction.zero();
  private events = new Array<MeasureEvent>();
  private quarterNoteDivisions = 1;

  constructor(private partId: string, private signature: FragmentSignature) {}

  /** Returns the events that were collected, sorted by at. */
  getEvents(): MeasureEvent[] {
    return this.events.toSorted((a, b) => a.at.toDecimal() - b.at.toDecimal());
  }

  /** Processes the measure entry, storing any events that occured. */
  process(entry: musicxml.MeasureEntry, measureIndex: number): void {
    if (entry instanceof musicxml.Note) {
      this.processNote(entry, measureIndex);
    }

    if (entry instanceof musicxml.Backup) {
      this.processBackup(entry);
    }

    if (entry instanceof musicxml.Forward) {
      this.processForward(entry);
    }

    if (entry instanceof musicxml.Attributes) {
      this.processAttributes(entry, measureIndex);
    }

    if (entry instanceof musicxml.Direction) {
      this.processDirection(entry, measureIndex);
    }
  }

  private processNote(note: musicxml.Note, measureIndex: number): void {
    if (note.isChordTail()) {
      return;
    }

    const voiceId = note.getVoice();
    const staveNumber = note.getStaveNumber();

    const quarterNotes = note.isGrace() ? 0 : note.getDuration();
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);

    this.events.push({
      type: 'note',
      at: this.at,
      duration,
      signature: this.signature.asData(),
      note,
      measureIndex,
      partId: this.partId,
      staveNumber,
      voiceId,
    });

    this.at = this.at.add(duration);
  }

  private processBackup(backup: musicxml.Backup): void {
    const quarterNotes = backup.getDuration();
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);

    this.at = this.at.subtract(duration);
  }

  private processForward(forward: musicxml.Forward): void {
    const quarterNotes = forward.getDuration();
    const duration = new Fraction(quarterNotes, this.quarterNoteDivisions);

    this.at = this.at.add(duration);
  }

  private processAttributes(attributes: musicxml.Attributes, measureIndex: number): void {
    this.quarterNoteDivisions = attributes.getQuarterNoteDivisions();
    this.signature = this.signature.updateWithAttributes(this.partId, { attributes });
    this.events.push({
      type: 'signature',
      at: this.at,
      measureIndex,
      signature: this.signature.asData(),
    });
  }

  private processDirection(direction: musicxml.Direction, measureIndex: number): void {
    const metronome = direction.getMetronome();
    const metronomeMark = metronome?.getMark();
    if (metronome && metronomeMark) {
      this.signature = this.signature.updateWithMetronome({ metronome, metronomeMark });
      this.events.push({
        type: 'signature',
        at: this.at,
        measureIndex,
        signature: this.signature.asData(),
      });
    }

    // TODO: Support multiple simultaneous octave shifts.
    const octaveShift = direction.getOctaveShifts().at(0);
    if (octaveShift) {
      this.events.push({ type: 'octaveshift', at: this.at, octaveShift, measureIndex, partId: this.partId });
    }

    // We only support one dynamic per part.
    const dynamics = direction.getDynamics().at(0);
    if (dynamics) {
      const placement = direction.getPlacement() ?? 'above';
      this.events.push({ type: 'dynamics', at: this.at, dynamics, measureIndex, partId: this.partId, placement });
    }
  }
}
