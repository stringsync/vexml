import * as musicxml from '@/musicxml';
import * as rendering from '@/rendering';

export type RenderOptions = {
  element: HTMLDivElement | HTMLCanvasElement;
  musicXml: string;
  width: number;
  config?: Partial<rendering.Config>;
};

/** Vexml contains the core operation of this library: rendering MusicXML in a web browser. */
export class Vexml {
  /** Renders a MusicXML document to an HTML element. */
  static render(opts: RenderOptions): rendering.ScoreRendering {
    const parser = new DOMParser();
    const root = parser.parseFromString(opts.musicXml, 'application/xml');

    const config = { ...rendering.DEFAULT_CONFIG, ...opts.config };
    const scorePartwise = new musicxml.MusicXml(root).getScorePartwise();

    const score = new rendering.Score({
      config,
      musicXml: {
        scorePartwise,
      },
    });

    return score.render({
      element: opts.element,
      width: opts.width,
    });
  }
}
