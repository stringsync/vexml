/** The result of rendering a voice. */
export type VoiceRendering = {
  type: 'voice';
};

/**
 * Represents a musical voice within a stave, containing a distinct sequence of notes, rests, and other musical
 * symbols.
 */
export class Voice {
  /** Renders the voice. */
  render(): VoiceRendering {
    return {
      type: 'voice',
    };
  }
}
