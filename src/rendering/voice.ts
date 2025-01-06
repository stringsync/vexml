import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Logger } from '@/debug';
import { Config } from './config';
import { Document } from './document';
import { VoiceKey } from './types';
import { Rect } from '@/spatial';
import { StaveNote, StaveNoteRender } from './stavenote';
import { StaveRest, StaveRestRender } from './staverest';
import { Fraction } from '@/util';

export type VoiceEntryRender = StaveNoteRender | StaveRestRender;

export type VoiceRender = {
  type: 'voice';
  key: VoiceKey;
  rect: Rect;
  vexflowVoice: vexflow.Voice;
  entryRenders: VoiceEntryRender[];
};

export class Voice {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceKey) {}

  render(): VoiceRender {
    const vexflowVoice = new vexflow.Voice().setMode(vexflow.Voice.Mode.SOFT);
    const entryRenders = this.renderEntries(vexflowVoice);

    return {
      type: 'voice',
      key: this.key,
      rect: Rect.empty(), // placeholder
      vexflowVoice,
      entryRenders,
    };
  }

  private renderEntries(vexflowVoice: vexflow.Voice): VoiceEntryRender[] {
    const entryRenders = new Array<VoiceEntryRender>();
    const entryCount = this.document.getVoiceEntryCount(this.key);

    let currentMeasureBeat = Fraction.zero();

    for (let voiceEntryIndex = 0; voiceEntryIndex < entryCount; voiceEntryIndex++) {
      const voiceEntryKey = { ...this.key, voiceEntryIndex };
      const entry = this.document.getVoiceEntry(voiceEntryKey);
      const measureBeat = Fraction.fromFractionLike(entry.measureBeat);
      const duration = Fraction.fromFractionLike(entry.duration);

      if (currentMeasureBeat.isLessThan(measureBeat)) {
        const vexflowGhostNote = this.renderVexflowGhostNote(measureBeat.subtract(currentMeasureBeat));
        vexflowVoice.addTickable(vexflowGhostNote);
        // NOTE: We don't need to add this is entryRenders because it's not a real entry.
      }
      currentMeasureBeat = measureBeat.add(duration);

      if (entry.type === 'note') {
        const staveNoteRender = new StaveNote(this.config, this.log, this.document, voiceEntryKey).render();
        vexflowVoice.addTickable(staveNoteRender.vexflowTickable);
        entryRenders.push(staveNoteRender);
      } else if (entry.type === 'rest') {
        const staveRestRender = new StaveRest(this.config, this.log, this.document, voiceEntryKey).render();
        vexflowVoice.addTickable(staveRestRender.vexflowTickable);
        entryRenders.push(staveRestRender);
      } else {
        util.assertUnreachable();
      }
    }

    return entryRenders;
  }

  private renderVexflowGhostNote(duration: Fraction): vexflow.GhostNote {
    return new vexflow.GhostNote({
      duration: 'q', // TODO: derive from duration
    });
  }
}
