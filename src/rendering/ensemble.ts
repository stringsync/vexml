import * as util from '@/util';
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
  vexflowTickable: vexflow.StaveNote;
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

  getStaveWidth(): number {
    return this.width ?? this.getMinRequiredStaveWidth();
  }

  getVoice(key: VoiceKey): EnsembleVoice {
    const voice = this.getVoices().find((v) => v.key.voiceIndex === key.voiceIndex);
    util.assertDefined(voice);
    return voice;
  }

  getEntry(key: VoiceEntryKey): EnsembleVoiceEntry {
    const entry = this.getVoices()
      .flatMap((v) => v.entries)
      .find((e) => e.key.voiceIndex === key.voiceIndex && e.key.voiceEntryIndex === key.voiceEntryIndex);
    util.assertDefined(entry);
    return entry;
  }

  format(width: number): void {
    const voices = this.getVoices().map((v) => v.vexflowVoice);
    const vexflowFormatter = new vexflow.Formatter();
    vexflowFormatter.joinVoices(voices).format(voices, width - vexflow.Stave.defaultPadding);
  }

  private getMinRequiredStaveWidth(): number {
    const vexflowVoices = this.getVoices().map((v) => v.vexflowVoice);
    const vexflowFormatter = new vexflow.Formatter();
    const minRequiredStaveWidth = vexflowFormatter.joinVoices(vexflowVoices).preCalculateMinTotalWidth(vexflowVoices);
    return minRequiredStaveWidth + this.config.BASE_VOICE_WIDTH;
  }

  @util.memoize()
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

          const entries = new Array<EnsembleVoiceEntry>();

          const voiceEntryCount = this.document.getVoiceEntryCount(voiceKey);
          for (let voiceEntryIndex = 0; voiceEntryIndex < voiceEntryCount; voiceEntryIndex++) {
            const voiceEntryKey: VoiceEntryKey = { ...voiceKey, voiceEntryIndex };

            const voiceEntry = this.document.getVoiceEntry(voiceEntryKey);

            if (voiceEntry.type === 'note') {
              const note = this.getNote(voiceEntryKey);
              entries.push(note);
            }
          }

          const vexflowTickables = entries.map((entry) => entry.vexflowTickable);
          const vexflowVoice = new vexflow.Voice().setMode(vexflow.Voice.Mode.SOFT).addTickables(vexflowTickables);

          voices.push({ type: 'voice', key: voiceKey, vexflowVoice, entries });
        }
      }
    }

    return voices;
  }

  private getNote(key: VoiceEntryKey): EnsembleNote {
    const note = this.document.getNote(key);

    const vexflowTickable = new vexflow.StaveNote({
      keys: [`${note.pitch}/${note.octave}`],
      duration: 'q',
    });

    return { type: 'note', key, vexflowTickable };
  }
}
