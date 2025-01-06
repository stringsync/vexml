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
import { DurationType } from '@/data/enums';

export type VoiceEntryRender = StaveNoteRender | StaveRestRender;

export type VoiceRender = {
  type: 'voice';
  key: VoiceKey;
  rect: Rect;
  vexflowVoice: vexflow.Voice;
  entryRenders: VoiceEntryRender[];
};

const DURATION_TYPE_VALUES: Array<{ type: DurationType; value: Fraction }> = [
  { type: '1/2', value: new Fraction(2, 1) },
  { type: '1', value: new Fraction(1, 1) },
  { type: '2', value: new Fraction(1, 2) },
  { type: '4', value: new Fraction(1, 4) },
  { type: '8', value: new Fraction(1, 8) },
  { type: '16', value: new Fraction(1, 16) },
  { type: '32', value: new Fraction(1, 32) },
  { type: '64', value: new Fraction(1, 64) },
  { type: '128', value: new Fraction(1, 128) },
  { type: '256', value: new Fraction(1, 256) },
  { type: '512', value: new Fraction(1, 512) },
  { type: '1024', value: new Fraction(1, 1024) },
];

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
        const beats = measureBeat.subtract(currentMeasureBeat).divide(new Fraction(4));
        const vexflowGhostNote = this.renderVexflowGhostNote(beats);
        vexflowVoice.addTickable(vexflowGhostNote);
        // NOTE: We don't need to add this is entryRenders because it's a vexflow-specific detail and vexml doesn't need
        // to do anything with it.
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

  private renderVexflowGhostNote(beatDuration: Fraction): vexflow.GhostNote {
    let closestDurationType: DurationType = '1/2';

    for (const { type, value } of DURATION_TYPE_VALUES) {
      if (value.isLessThanOrEqualTo(beatDuration)) {
        closestDurationType = type;
        break;
      }
    }

    return new vexflow.GhostNote({ duration: closestDurationType });
  }
}
