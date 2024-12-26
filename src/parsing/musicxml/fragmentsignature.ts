import * as musicxml from '@/musicxml';
import { Metronome } from './metronome';
import { Clef } from './clef';
import { KeySignature } from './keysignature';
import { TimeSignature } from './timesignature';
import { StaveLineCount } from './stavelinecount';

export type FragmentSignatureChange =
  | { component: 'metronome' }
  | {
      component: 'clef' | 'keysignature' | 'timesignature' | 'stavelinecount';
      partId: string;
      staveNumber: number;
    };

/** FragmentSignature represents attributes that cause new measure fragments to be created mid-measure. */
export class FragmentSignature {
  private constructor(
    private metronome: Metronome,
    private clefs: Clef[],
    private keySignatures: KeySignature[],
    private timeSignatures: TimeSignature[],
    private staveLineCounts: StaveLineCount[],
    private changes: FragmentSignatureChange[]
  ) {}

  /** Returns a default FragmentSignature. */
  static default() {
    return new FragmentSignature(Metronome.default(), [], [], [], [], []);
  }

  hasChanges(): boolean {
    return this.changes.length > 0;
  }

  getChanges(): FragmentSignatureChange[] {
    return this.changes;
  }

  getMetronome(): Metronome {
    return this.metronome;
  }

  getStaveLineCounts(): StaveLineCount[] {
    return this.staveLineCounts;
  }

  getClefs(): Clef[] {
    return this.clefs;
  }

  getKeySignatures(): KeySignature[] {
    return this.keySignatures;
  }

  getTimeSignatures(): TimeSignature[] {
    return this.timeSignatures;
  }

  getStaveLineCount(partId: string, staveNumber: number): StaveLineCount {
    return (
      this.staveLineCounts.find((count) => count.getPartId() === partId && count.getStaveNumber() === staveNumber) ??
      StaveLineCount.default(partId, staveNumber)
    );
  }

  getClef(partId: string, staveNumber: number): Clef {
    return (
      this.clefs.find((clef) => clef.getPartId() === partId && clef.getStaveNumber() === staveNumber) ??
      Clef.default(partId, staveNumber)
    );
  }

  getKeySignature(partId: string, staveNumber: number): KeySignature {
    return (
      this.keySignatures.find((key) => key.getPartId() === partId && key.getStaveNumber() === staveNumber) ??
      KeySignature.default(partId, staveNumber)
    );
  }

  getTimeSignature(partId: string, staveNumber: number): TimeSignature {
    return (
      this.timeSignatures.find((time) => time.getPartId() === partId && time.getStaveNumber() === staveNumber) ??
      TimeSignature.default(partId, staveNumber)
    );
  }

  mergeAttributes(partId: string, musicXML: { attributes: musicxml.Attributes }): FragmentSignature {
    const changedClefs = this.getChangedClefs(partId, musicXML);
    const changedTimeSignatures = this.getChangedTimeSignatures(partId, musicXML);
    const changedKeySignatures = this.getChangedKeySignatures(partId, musicXML);
    const changedStaveLineCounts = this.getChangedStaveLineCounts(partId, musicXML);

    const changes = new Array<FragmentSignatureChange>();
    for (const clef of changedClefs) {
      changes.push({ component: 'clef', partId, staveNumber: clef.getStaveNumber() });
    }
    for (const timeSignature of changedTimeSignatures) {
      changes.push({ component: 'timesignature', partId, staveNumber: timeSignature.getStaveNumber() });
    }
    for (const keySignature of changedKeySignatures) {
      changes.push({ component: 'keysignature', partId, staveNumber: keySignature.getStaveNumber() });
    }
    for (const staveLineCount of changedStaveLineCounts) {
      changes.push({ component: 'stavelinecount', partId, staveNumber: staveLineCount.getStaveNumber() });
    }

    const clefStaveNumbers = changedClefs.map((clef) => clef.getStaveNumber());
    const timeSignatureStaveNumbers = changedTimeSignatures.map((time) => time.getStaveNumber());
    const keySignatureStaveNumbers = changedKeySignatures.map((key) => key.getStaveNumber());
    const staveLineCountStaveNumbers = changedStaveLineCounts.map((count) => count.getStaveNumber());

    // prettier-ignore
    const clefs = [
      ...this.clefs.filter((clef) => !clefStaveNumbers.includes(clef.getStaveNumber())), 
      ...changedClefs
    ];
    const timeSignatures = [
      ...this.timeSignatures.filter((time) => !timeSignatureStaveNumbers.includes(time.getStaveNumber())),
      ...changedTimeSignatures,
    ];
    const keySignatures = [
      ...this.keySignatures.filter((key) => !keySignatureStaveNumbers.includes(key.getStaveNumber())),
      ...changedKeySignatures,
    ];
    const staveLineCounts = [
      ...this.staveLineCounts.filter((count) => !staveLineCountStaveNumbers.includes(count.getStaveNumber())),
      ...changedStaveLineCounts,
    ];

    return new FragmentSignature(this.metronome, clefs, keySignatures, timeSignatures, staveLineCounts, changes);
  }

  mergeMetronome(musicXML: {
    metronome: musicxml.Metronome;
    metronomeMark: musicxml.MetronomeMark;
  }): FragmentSignature {
    const current = this.metronome;
    const proposed = current.merge({
      metronome: musicXML.metronome,
      metronomeMark: musicXML.metronomeMark,
    });
    const changes = new Array<FragmentSignatureChange>();
    if (!current.isEqual(proposed)) {
      changes.push({ component: 'metronome' });
    }
    return new FragmentSignature(
      proposed,
      this.clefs,
      this.keySignatures,
      this.timeSignatures,
      this.staveLineCounts,
      changes
    );
  }

  private getChangedClefs(partId: string, musicXML: { attributes: musicxml.Attributes }): Clef[] {
    return musicXML.attributes.getClefs().flatMap((clef) => {
      const staveNumber = clef.getStaveNumber();
      const current = this.getClef(partId, staveNumber);
      const proposed = current.merge({ clef });
      if (current.isEqual(proposed)) {
        return [];
      } else {
        return [proposed];
      }
    });
  }

  private getChangedTimeSignatures(partId: string, musicXML: { attributes: musicxml.Attributes }): TimeSignature[] {
    return musicXML.attributes.getTimes().flatMap((time) => {
      const staveNumber = time.getStaveNumber();
      const current = this.getTimeSignature(partId, staveNumber);
      const proposed = current.merge({ time });
      if (current.isEqual(proposed)) {
        return [];
      } else {
        return [proposed];
      }
    });
  }

  private getChangedKeySignatures(partId: string, musicXML: { attributes: musicxml.Attributes }): KeySignature[] {
    return musicXML.attributes.getKeys().flatMap((key) => {
      const staveNumber = key.getStaveNumber();
      const current = this.getKeySignature(partId, staveNumber);
      const proposed = current.merge({ key });
      if (current.isEqual(proposed)) {
        return [];
      } else {
        return [proposed];
      }
    });
  }

  private getChangedStaveLineCounts(partId: string, musicXML: { attributes: musicxml.Attributes }): StaveLineCount[] {
    return musicXML.attributes.getStaveDetails().flatMap((staveDetail) => {
      const staveNumber = staveDetail.getStaveNumber();
      const current = this.getStaveLineCount(partId, staveNumber);
      const proposed = current.merge({ staveDetail });
      if (current.isEqual(proposed)) {
        return [];
      } else {
        return [proposed];
      }
    });
  }
}
