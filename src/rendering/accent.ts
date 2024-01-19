import * as vexflow from 'vexflow';

/** The result of rendering an accent. */
export type AccentRendering = {
  type: 'accent';
  vexflow: {
    articulation: vexflow.Articulation;
  };
};

/** Represents an emphasis, stress, or stronger attack placed on a particular note or set of notes or chord. */
export class Accent {
  /** Renders the Accent. */
  render(): AccentRendering {
    return {
      type: 'accent',
      vexflow: {
        articulation: new vexflow.Articulation('a>'),
      },
    };
  }
}
