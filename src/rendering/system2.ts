import { Config } from './config';
import { Measure } from './measure2';

/** The result of rendering a system. */
export type SystemRendering = {
  type: 'system';
};

/**
 * Represents a System in a musical score, a horizontal grouping of staves spanning the width of the viewport or page.
 * Each system contains a segment of musical content from one or more parts, and multiple systems collectively render
 * the entirety of those parts.
 */
export class System {
  private config: Config;
  private index: number;
  private measures: Measure[];

  constructor(opts: { config: Config; index: number; measures: Measure[] }) {
    this.config = opts.config;
    this.index = opts.index;
    this.measures = opts.measures;
  }

  /** Renders the system. */
  render(): SystemRendering {
    return {
      type: 'system',
    };
  }
}
