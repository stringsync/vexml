/** The result of rendering a chorus. */
export type ChorusRendering = {
  type: 'chorus';
};

/** Houses the coordination of several voices. */
export class Chorus {
  /** Renders the chorus. */
  render(): ChorusRendering {
    return {
      type: 'chorus',
    };
  }
}
