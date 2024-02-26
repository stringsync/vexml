import { Division } from './division';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { StemDirection } from './enums';
import { StaveSignature } from './stavesignature';
import { Config } from './config';
import { Spanners } from './spanners';
import { Address } from './address';

/** The result of rendering a voice. */
export type VoiceRendering = {
  type: 'voice';
  vexflow: {
    voice: vexflow.Voice;
  };
};

export type VoiceEntry = {
  voiceId: string;
  staveSignature: StaveSignature;
  note: musicxml.Note;
  stem: StemDirection;
  start: Division;
  end: Division;
  directions: musicxml.Direction[];
};

/**
 * Represents a musical voice within a stave, containing a distinct sequence of notes, rests, and other musical
 * symbols.
 */
export class Voice {
  private config: Config;
  private entries: VoiceEntry[];

  constructor(opts: { config: Config; entries: VoiceEntry[] }) {
    this.config = opts.config;
    this.entries = opts.entries;
  }

  /** Renders the voice. */
  render(opts: { address: Address<'voice'>; spanners: Spanners }): VoiceRendering {
    const vfVoice = new vexflow.Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);

    return {
      type: 'voice',
      vexflow: {
        voice: vfVoice,
      },
    };
  }
}
