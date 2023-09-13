import { System, SystemRendering } from './system';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

export type ScoreRendering = {
  type: 'score';
  systems: SystemRendering[];
};

/**
 * Represents a Score in a musical composition, serving as the top-level container
 * for all musical elements and metadata. The Score encompasses the entirety of a piece,
 * housing individual parts, systems, and other musical components. It also provides
 * contextual information like title, composer, and other pertinent details.
 */
export class Score {
  static create(musicXml: musicxml.MusicXml): Score {
    const parts = musicXml.getScorePartwise()?.getParts() ?? [];

    const system = System.create({ musicXml: { parts } });

    return new Score(system);
  }

  private system: System;

  private constructor(system: System) {
    this.system = system;
  }

  render(opts: { element: HTMLDivElement | HTMLCanvasElement; width: number }): ScoreRendering {
    // Track the system rendering results.
    const systemRenderings = new Array<SystemRendering>();

    // Split the main system into smaller ones to fit in the width.
    const systems = this.system.split(opts.width);

    let y = 0;

    // Render the entire hierarchy.
    for (const system of systems) {
      const systemRendering = system.render({ x: 0, y, width: opts.width });
      systemRenderings.push(systemRendering);
      y += 300;
    }

    // Get a reference to the staves.
    const staves = systemRenderings
      .flatMap((system) => system.parts)
      .flatMap((part) => part.measures)
      .flatMap((measure) => measure.staves);

    const vfRenderer = new vexflow.Renderer(opts.element, vexflow.Renderer.Backends.SVG);
    vfRenderer.resize(400, y + 400);
    const vfContext = vfRenderer.getContext();

    // Render vexflow.Stave elements.
    const vfStaves = staves.map((stave) => stave.vexflow.stave);
    for (const vfStave of vfStaves) {
      vfStave.setContext(vfContext).draw();
    }

    // Render vexflow.Voice elements.
    const vfVoices = staves.flatMap((stave) => stave.voices).map((voice) => voice.vexflow.voice);
    for (const vfVoice of vfVoices) {
      vfVoice.setContext(vfContext).draw();
    }

    return { type: 'score', systems: systemRenderings };
  }
}
