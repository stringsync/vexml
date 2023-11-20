import * as musicxml from '@/musicxml';
import * as rendering from '@/rendering';

export type RenderOptions = {
  element: HTMLDivElement | HTMLCanvasElement;
  config?: Partial<rendering.Config>;
  width: number;
};

/** Vexml contains the core operation of this library: rendering MusicXML in a web browser. */
export class Vexml {
  constructor(private musicXml: musicxml.MusicXml) {}

  /** Creates an instance from a MusicXML string. */
  static fromMusicXML(musicXML: string): Vexml {
    const doc = new DOMParser().parseFromString(musicXML, 'application/xml');
    const root = new musicxml.MusicXml(doc);
    return new Vexml(root);
  }

  /** Creates an instance from a buffer containing a MusicXML string. */
  static fromBuffer(buffer: Buffer): Vexml {
    return Vexml.fromMusicXML(buffer.toString());
  }

  /** Creates an instance from a URL that corresponds to a MusicXML string. */
  static async fromURL(url: string | URL | Request): Promise<Vexml> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`expected response to be ok, got: ${response.statusText} (${response.status})`);
    }
    const musicXML = await response.text();
    return Vexml.fromMusicXML(musicXML);
  }

  /** Creates an instance from a Blob of a MusicXML string or a .mxl archive (compressed MusicXML file). */
  static async fromBlob(blob: Blob): Promise<Vexml> {
    // TODO, use a real implementation.
    return Vexml.fromMusicXML('');
  }

  /** Creates an instance from a File of a MusicXML string or a .mxl archive (compressed MusicXML file). */
  static async fromFile(file: File): Promise<Vexml> {
    return Vexml.fromBlob(file);
  }

  /** Renders the vexml instance to an HTML element. */
  render(opts: RenderOptions): rendering.ScoreRendering {
    const config = { ...rendering.DEFAULT_CONFIG, ...opts.config };

    const score = new rendering.Score({
      config,
      musicXml: {
        scorePartwise: this.musicXml.getScorePartwise(),
      },
    });

    return score.render({
      element: opts.element,
      width: opts.width,
    });
  }
}
