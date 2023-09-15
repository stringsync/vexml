import * as musicxml from '@/musicxml';
import * as rendering from '@/rendering';

export type RenderOptions = {
  element: HTMLDivElement | HTMLCanvasElement;
  xml: string;
  width: number;
  config?: Partial<rendering.Config>;
};

/** Vexml contains the core operation of this library: rendering MusicXML in a web browser. */
export class Vexml {
  /** Renders a MusicXML document to an HTML element. */
  static render(opts: RenderOptions): rendering.ScoreRendering {
    const parser = new DOMParser();
    const root = parser.parseFromString(opts.xml, 'application/xml');

    const musicXml = new musicxml.MusicXml(root);
    const config = opts.config;

    return rendering.Score.create({ musicXml, config }).render({
      element: opts.element,
      width: opts.width,
    });
  }
}
