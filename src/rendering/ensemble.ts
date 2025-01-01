import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { MeasureEntryKey, PartKey, StaveKey, VoiceEntryKey, VoiceKey } from './types';
import { Document } from './document';
import { Point } from '@/spatial';

type EnsembleVoice = {
  type: 'voice';
  key: VoiceKey;
  vexflowVoice: vexflow.Voice;
  entries: EnsembleVoiceEntry[];
};

type EnsembleVoiceEntry = EnsembleNote;

type EnsembleNote = {
  type: 'note';
  key: VoiceEntryKey;
  tickable: vexflow.StaveNote;
};

/**
 * An ensemble is a collection of voices across staves and parts that should be formatted together.
 *
 * This class serves as a staging area for coordinating layouts. It is not directly rendered, but the vexflow data
 * is used to render staves, voices, and voice entries.
 */
export class Ensemble {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null
  ) {}

  getMinRequiredStaveWidth(): number {
    const vexflowVoices = this.getVoices().map((v) => v.vexflowVoice);
    const vexflowFormatter = new vexflow.Formatter();
    const minRequiredStaveWidth = vexflowFormatter.joinVoices(vexflowVoices).preCalculateMinTotalWidth(vexflowVoices);
    return minRequiredStaveWidth + this.config.BASE_VOICE_WIDTH;
  }

  private getVoices(): EnsembleVoice[] {
    const voices = new Array<EnsembleVoice>();

    const partCount = this.document.getPartCount(this.key);
    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partKey: PartKey = { ...this.key, partIndex };

      const staveCount = this.document.getStaveCount(partKey);
      for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
        const staveKey: StaveKey = { ...partKey, staveIndex };

        const voiceCount = this.document.getVoiceCount(staveKey);
        for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
          const voiceKey: VoiceKey = { ...staveKey, voiceIndex };

          const entries = this.getEntries(voiceKey);
          const vexflowTickables = entries.map((entry) => entry.tickable);
          const vexflowVoice = new vexflow.Voice().setMode(vexflow.Voice.Mode.SOFT).addTickables(vexflowTickables);

          voices.push({ type: 'voice', key: voiceKey, vexflowVoice, entries });
        }
      }
    }

    return voices;
  }

  private getEntries(key: VoiceKey): EnsembleVoiceEntry[] {
    const entries = new Array<EnsembleVoiceEntry>();

    const voiceEntryCount = this.document.getVoiceEntryCount(key);
    for (let voiceEntryIndex = 0; voiceEntryIndex < voiceEntryCount; voiceEntryIndex++) {
      const voiceEntryKey: VoiceEntryKey = { ...key, voiceEntryIndex };

      const voiceEntry = this.document.getVoiceEntry(voiceEntryKey);

      if (voiceEntry.type === 'note') {
        const note = this.getNote(voiceEntryKey);
        entries.push(note);
      }
    }

    return entries;
  }

  private getNote(key: VoiceEntryKey): EnsembleNote {
    const note = this.document.getNote(key);

    const vexflowStaveNote = new vexflow.StaveNote({
      keys: [`${note.pitch}/${note.octave}`],
      duration: 'q',
    });

    return { type: 'note', key, tickable: vexflowStaveNote };
  }
}
