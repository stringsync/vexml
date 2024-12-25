import * as musicxml from '@/musicxml';
import { Fraction } from '@/util';
import { FragmentSignature } from './fragmentsignature';
import { MeasureEvent } from './types';

/** MeasureEntryProcessor is a helper that incrementally tracks measure events for a given part. */
export class MeasureEntryProcessor {
  private beat = Fraction.zero();
  private events = new Array<MeasureEvent>();
  private quarterNoteDivisions = 1;
  private fragmentSignature = FragmentSignature.default();

  constructor(private partId: string) {}

  /** Returns the events that were collected, sorted by beat. */
  getEvents(): MeasureEvent[] {
    return this.events.toSorted(
      (a, b) => Fraction.fromFractionLike(a.beat).toDecimal() - Fraction.fromFractionLike(b.beat).toDecimal()
    );
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
      beat: this.beat,
      duration,
      fragmentSignature: this.fragmentSignature.asData(),
      note,
      measureIndex,
      partId: this.partId,
      staveNumber,
      voiceId,
    });

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

  private processAttributes(attributes: musicxml.Attributes, measureIndex: number): void {
    this.quarterNoteDivisions = attributes.getQuarterNoteDivisions();
    this.fragmentSignature = this.fragmentSignature.updateWithAttributes(this.partId, { attributes });
    this.events.push({
      type: 'signature',
      beat: this.beat,
      partId: this.partId,
      measureIndex,
      fragmentSignature: this.fragmentSignature.asData(),
    });
  }

  private processDirection(direction: musicxml.Direction, measureIndex: number): void {
    const metronome = direction.getMetronome();
    const metronomeMark = metronome?.getMark();
    if (metronome && metronomeMark) {
      this.fragmentSignature = this.fragmentSignature.updateWithMetronome({ metronome, metronomeMark });
      this.events.push({
        type: 'signature',
        beat: this.beat,
        partId: this.partId,
        measureIndex,
        fragmentSignature: this.fragmentSignature.asData(),
      });
    }

    // TODO: Support multiple simultaneous octave shifts.
    const octaveShift = direction.getOctaveShifts().at(0);
    if (octaveShift) {
      this.events.push({
        type: 'octaveshift',
        beat: this.beat,
        octaveShift,
        measureIndex,
        partId: this.partId,
        fragmentSignature: this.fragmentSignature.asData(),
      });
    }

    // We only support one dynamic per part.
    const dynamics = direction.getDynamics().at(0);
    if (dynamics) {
      const placement = direction.getPlacement() ?? 'above';
      this.events.push({
        type: 'dynamics',
        beat: this.beat,
        dynamics,
        measureIndex,
        partId: this.partId,
        placement,
        fragmentSignature: this.fragmentSignature.asData(),
      });
    }
  }
}
