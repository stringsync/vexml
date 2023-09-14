import * as musicxml from '@/musicxml';
import * as rendering from '@/rendering';

export type RenderOptions = {
  element: HTMLDivElement | HTMLCanvasElement;
  xml: string;
  width: number;
};

/** Vexml contains the core operation of this library: rendering MusicXML in a web browser. */
export class Vexml {
  /** Renders a MusicXML document to an HTML element. */
  static render(opts: RenderOptions): rendering.ScoreRendering {
    const parser = new DOMParser();
    const root = parser.parseFromString(opts.xml, 'application/xml');
    const musicXml = new musicxml.MusicXml(root);

    return rendering.Score.create(musicXml).render({ element: opts.element, width: opts.width });
  }
}
