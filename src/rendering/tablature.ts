/** The result of rendering a Tablature. */
export type TablatureRendering = {
  type: 'tablature';
};

/** Represents tablature for stringed instrumented. */
export class Tablature {
  constructor() {}

  /** Renders a Tablature. */
  render(): TablatureRendering {
    return { type: 'tablature' };
  }
}
