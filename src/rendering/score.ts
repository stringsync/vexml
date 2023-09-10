import { System } from './system';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

type CreateOptions = {
  musicXml: musicxml.MusicXml;
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
  width: number;
};

/**
 * Represents a Score in a musical composition, serving as the top-level container
 * for all musical elements and metadata. The Score encompasses the entirety of a piece,
 * housing individual parts, systems, and other musical components. It also provides
 * contextual information like title, composer, and other pertinent details.
 */
export class Score {
  static create(opts: CreateOptions): Score {
    const parts = opts.musicXml.getScorePartwise()?.getParts() ?? [];
    const system = System.create({ musicXml: { parts } });

    return new Score(system);
  }

  private system: System;

  private constructor(system: System) {
    this.system = system;
  }

  render(opts: RenderOptions): void {
    this.system.split(opts.width).forEach((system) => system.render({ ctx: opts.ctx }));
  }
}
