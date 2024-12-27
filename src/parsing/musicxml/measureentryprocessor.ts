import * as musicxml from '@/musicxml';

/** MeasureEntryProcessor is a helper that incrementally tracks measure events for a given part. */
export class MeasureEntryProcessor {
  /** Processes the measure entry, storing any events that occured. */
  process(entry: musicxml.MeasureEntry, partId: string, measureIndex: number): void {
    if (entry instanceof musicxml.Note) {
      this.processNote(entry, partId, measureIndex);
    }

    if (entry instanceof musicxml.Backup) {
      this.processBackup(entry, partId);
    }

    if (entry instanceof musicxml.Forward) {
      this.processForward(entry, partId);
    }

    if (entry instanceof musicxml.Attributes) {
      this.processAttributes(entry, partId, measureIndex);
    }

    if (entry instanceof musicxml.Direction) {
      this.processDirection(entry, partId, measureIndex);
    }
  }

  private processNote(note: musicxml.Note, partId: string, measureIndex: number): void {}

  private processBackup(backup: musicxml.Backup, partId: string): void {}

  private processForward(forward: musicxml.Forward, partId: string): void {}

  private processAttributes(attributes: musicxml.Attributes, partId: string, measureIndex: number): void {}

  private processDirection(direction: musicxml.Direction, partId: string, measureIndex: number): void {}
}
