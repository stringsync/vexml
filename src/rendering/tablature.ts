/** The result of rendering a Tablature. */
export type TablatureRendering = {
  type: 'tablature';
};

/** Represents tablature for stringed instrumented. */
export class Tablature {
  private constructor() {}

  /** Creates a Tablature. */
  static create(): Tablature {
    return new Tablature();
  }

  /** Clones a Tablature. */
  clone(): Tablature {
    return new Tablature();
  }

  /** Renders a Tablature. */
  render(): TablatureRendering {
    return { type: 'tablature' };
  }
}
