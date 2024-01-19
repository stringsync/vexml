/** The result of rendering an accent. */
export type AccentRendering = {
  type: 'accent';
};

/** Represents an emphasis, stress, or stronger attack placed on a particular note or set of notes or chord. */
export class Accent {
  /** Renders the Accent. */
  render(): AccentRendering {
    return {
      type: 'accent',
    };
  }
}
