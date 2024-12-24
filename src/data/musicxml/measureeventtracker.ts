import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { Fraction } from '@/util';

export type MeasureEvent =
  | {
      type: 'note';
      start: Fraction;
    }
  | {
      type: 'fragment';
      start: Fraction;
    };

/** MeasureEventTracker is a parser helper that incrementally tracks measure events. */
export class MeasureEventTracker {
  private start = Fraction.zero();
  private events = new Array<MeasureEvent>();

  constructor(private staveSignature: data.StaveSignature) {}

  getEvents(): MeasureEvent[] {
    return this.events;
  }

  update(entry: musicxml.MeasureEntry): void {
    if (entry instanceof musicxml.Note) {
      // TODO
    }

    if (entry instanceof musicxml.Backup) {
      // TODO
    }

    if (entry instanceof musicxml.Forward) {
      // TODO
    }

    if (entry instanceof musicxml.Attributes) {
      // TODO
    }

    if (entry instanceof musicxml.Direction) {
      // TODO
    }
  }

  private onNote(note: musicxml.Note): void {}

  private onBackup(backup: musicxml.Backup): void {}

  private onForward(forward: musicxml.Forward): void {}

  private onAttributes(attributes: musicxml.Attributes): void {}

  private onDirection(direction: musicxml.Direction): void {}
}
