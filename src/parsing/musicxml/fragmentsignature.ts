import * as musicxml from '@/musicxml';
import { Metronome } from './metronome';
import { Clef } from './clef';
import { KeySignature } from './keysignature';
import { TimeSignature } from './timesignature';
import { StaveLineCount } from './stavelinecount';

type FragmentSignatureChange =
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
      StaveLineCount.default()
    );
  }

  getClef(partId: string, staveNumber: number): Clef {
    return (
      this.clefs.find((clef) => clef.getPartId() === partId && clef.getStaveNumber() === staveNumber) ?? Clef.default()
    );
  }

  getKeySignature(partId: string, staveNumber: number): KeySignature {
    return (
      this.keySignatures.find((key) => key.getPartId() === partId && key.getStaveNumber() === staveNumber) ??
      KeySignature.default()
    );
  }

  getTimeSignature(partId: string, staveNumber: number): TimeSignature {
    return (
      this.timeSignatures.find((time) => time.getPartId() === partId && time.getStaveNumber() === staveNumber) ??
      TimeSignature.default()
    );
  }

  applyAttributes(partId: string, musicXML: { attributes: musicxml.Attributes }): FragmentSignature {
    return this;
  }

  applyMetronome(musicXML: {
    metronome: musicxml.Metronome;
    metronomeMark: musicxml.MetronomeMark;
  }): FragmentSignature {
    return this;
  }
}
