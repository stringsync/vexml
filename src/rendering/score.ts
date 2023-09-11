import { System } from './system';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

type ScoreCreateOptions = {
  musicXml: musicxml.MusicXml;
};

type ScoreRenderOptions = {
  ctx: vexflow.RenderContext;
  width: number;
};

export type ScoreRenderResult = {
  systems: Array<{
    parts: Array<{
      measures: Array<{
        components: Array<{
          vexflow: {
            stave: vexflow.Stave;
            voices: vexflow.Voice[];
          };
        }>;
      }>;
    }>;
  }>;
};

/**
 * Represents a Score in a musical composition, serving as the top-level container
 * for all musical elements and metadata. The Score encompasses the entirety of a piece,
 * housing individual parts, systems, and other musical components. It also provides
 * contextual information like title, composer, and other pertinent details.
 */
export class Score {
  static create(opts: ScoreCreateOptions): Score {
    const parts = opts.musicXml.getScorePartwise()?.getParts() ?? [];

    const system = System.create({ musicXml: { parts } });

    return new Score(system);
  }

  private system: System;

  private constructor(system: System) {
    this.system = system;
  }

  render(opts: ScoreRenderOptions): ScoreRenderResult {
    // Track the system rendering results.
    const systems = new Array<{
      parts: Array<{
        measures: Array<{
          components: Array<{
            vexflow: {
              stave: vexflow.Stave;
              voices: vexflow.Voice[];
            };
          }>;
        }>;
      }>;
    }>();

    // Render the entire hierarchy.
    for (const system of this.system.split(opts.width)) {
      const result = system.render({ ctx: opts.ctx });
      systems.push({ parts: result.parts });
    }

    // Get a reference to the measure components.
    const components = systems
      .flatMap((system) => system.parts)
      .flatMap((part) => part.measures)
      .flatMap((measure) => measure.components);

    // Render vexflow.Stave elements.
    const vfStaves = components.map((component) => component.vexflow.stave);
    for (const vfStave of vfStaves) {
      vfStave.draw();
    }

    // Render vexflow.Voice elements.
    const vfVoices = components.flatMap((component) => component.vexflow.voices);
    for (const vfVoice of vfVoices) {
      vfVoice.draw();
    }

    return { systems };
  }
}
