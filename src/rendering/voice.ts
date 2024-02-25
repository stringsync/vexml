import { Division } from './division';
import * as musicxml from '@/musicxml';
import { StemDirection } from './enums';
import { StaveSignature } from './stavesignature';
import { Config } from '.';

/** The result of rendering a voice. */
export type VoiceRendering = {
  type: 'voice';
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
  render(): VoiceRendering {
    return {
      type: 'voice',
    };
  }
}
