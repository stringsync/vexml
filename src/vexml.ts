import * as musicxml from '@/musicxml';
import * as mxl from '@/mxl';
import * as rendering from '@/rendering';
import * as cursors from '@/cursors';
import * as events from '@/events';
import * as spatial from '@/spatial';
import * as util from '@/util';

export type RenderOptions = {
  container: HTMLDivElement | HTMLCanvasElement;
  config?: Partial<rendering.Config>;
  width: number;
};

/** Vexml contains the core operation of this library: rendering MusicXML in a web browser. */
export class Vexml {
  constructor(private musicXML: musicxml.MusicXML) {}

  /** Creates an instance from a MusicXML string. */
  static fromMusicXML(musicXML: string): Vexml {
    const doc = new DOMParser().parseFromString(musicXML, 'application/xml');
    const root = new musicxml.MusicXML(doc);
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
    const errors = [];

    // Try parsing as MXL.
    try {
      const musicXML = await new mxl.MXL(blob).getMusicXML();
      return Vexml.fromMusicXML(musicXML);
    } catch (e) {
      errors.push(`tried to parse as MXL, but got: ${e}`);
    }

    // Try parsing as MusicXML.
    try {
      const musicXML = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result;
          if (typeof result === 'string') {
            resolve(result);
          } else {
            reject(new Error(`expected string from reading file, got: ${typeof result}`));
          }
        };
        reader.readAsText(blob);
      });
      return Vexml.fromMusicXML(musicXML);
    } catch (e) {
      errors.push(`tried to parse directly as MusicXML, but got ${e}`);
    }

    throw new Error(errors.join('\n\n'));
  }

  /** Creates an instance from a File of a MusicXML string or a .mxl archive (compressed MusicXML file). */
  static async fromFile(file: File): Promise<Vexml> {
    return Vexml.fromBlob(file);
  }

  /** Renders the vexml instance to an HTML element. */
  render(opts: RenderOptions): rendering.Rendering {
    const config = { ...rendering.DEFAULT_CONFIG, ...opts.config };

    const scorePartwise = this.musicXML.getScorePartwise();
    const score = new rendering.Score({ config, musicXML: { scorePartwise } });
    const scoreRendering = score.render({ container: opts.container, width: opts.width });

    const topic = new events.Topic<rendering.Events>();
    const device = util.device();

    let host: Element = opts.container;
    if (host instanceof HTMLDivElement) {
      host = host.firstElementChild!;
    }

    const tree = this.getTree(scoreRendering);
    const cursor = new cursors.PointCursor(tree);

    return new rendering.Rendering({ config, host, cursor, topic, device });
  }

  /** Returns the document string. */
  getDocumentString(): string {
    return this.musicXML.getDocumentString();
  }

  private getTree(scoreRendering: rendering.ScoreRendering): spatial.QuadTree<any> {
    const tree = new spatial.QuadTree(scoreRendering.rect, 4);

    const staveNotes = scoreRendering.systems
      .flatMap((system) => system.measures)
      .flatMap((measure) => measure.fragments)
      .flatMap((fragment) => fragment.parts)
      .flatMap((part) => part.staves)
      .flatMap((stave) => stave.entry)
      .flatMap((staveEntry) => {
        if (staveEntry.type === 'chorus') {
          return staveEntry.voices;
        }
        return [];
      })
      .flatMap((voice) => voice.entries)
      .flatMap((voiceEntry) => {
        if (voiceEntry.type === 'stavenote') {
          return voiceEntry;
        }
        return [];
      });

    for (const staveNote of staveNotes) {
      const rects = new Array<spatial.LegacyRect>();

      const box = staveNote.vexflow.staveNote.getBoundingBox();
      rects.push(new spatial.LegacyRect(box.x, box.y, box.w, box.h));

      rects.push(
        ...staveNote.vexflow.staveNote.noteHeads.map((notehead) => {
          const box = notehead.getBoundingBox();
          return new spatial.LegacyRect(box.x, box.y, box.w, box.h);
        })
      );

      const anchors = rects.map((rect) => rect.center());
      const region = new spatial.Region(scoreRendering.rect, anchors);
      for (const anchor of anchors) {
        tree.insert({ point: anchor, data: { region, staveNote } });
      }
    }

    return tree;
  }
}
