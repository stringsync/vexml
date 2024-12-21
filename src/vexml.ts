import * as musicxml from '@/musicxml';
import * as mxl from '@/mxl';
import * as rendering from '@/rendering';
import * as events from '@/events';
import * as components from '@/components';
import * as playback from '@/playback';
import * as debug from '@/debug';
import { Config, DEFAULT_CONFIG } from '@/config';

export type RenderOptions = {
  element: HTMLDivElement;
  config?: Partial<Config>;
  backend?: 'svg' | 'canvas';
  width: number;
  height?: number;
  logger?: debug.Logger;
};

/** Vexml contains the core operation of this library: rendering MusicXML in a web browser. */
export class Vexml {
  private messageMeasures = new Array<rendering.MessageMeasure>();

  private constructor(private musicXML: musicxml.MusicXML) {}

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

  /** Sets the message measures for this Vexml instance. */
  setMessageMeasures(...messageMeasures: rendering.MessageMeasure[]): this {
    this.messageMeasures = messageMeasures;

    // We validate the indexes because it is error-prone to insert message measures with incorrect indexes.
    const indexes = messageMeasures.map(({ absoluteMeasureIndex }) => absoluteMeasureIndex);
    const seen = new Set<number>();
    for (const index of indexes) {
      if (index < 0) {
        throw new Error(`expected all absoluteMeasureIndexes to be non-negative, got: ${index}`);
      }
      if (!Number.isInteger(index)) {
        throw new Error(`expected all absoluteMeasureIndexes to be integers, got: ${index}`);
      }
      if (seen.has(index)) {
        throw new Error(`expected all absoluteMeasureIndexes to be unique`);
      }
      seen.add(index);
    }

    return this;
  }

  /** Renders the vexml instance to an SVG element. */
  render(opts: RenderOptions): rendering.Rendering {
    const config = { ...DEFAULT_CONFIG, ...opts.config };
    const element = opts.element;
    const width = opts.width;
    const height = opts.height;
    const backend = opts.backend;
    const log = opts.logger ?? new debug.NoopLogger();

    let root: components.Root;
    switch (backend) {
      case 'svg':
        root = components.Root.svg(element, height);
        break;
      case 'canvas':
        root = components.Root.canvas(element, height);
        break;
      default:
        log.info(`backend not specified or supported, defaulting to 'svg'`);
        root = components.Root.svg(element, height);
    }

    // Render score.
    const scorePartwise = this.musicXML.getScorePartwise();
    const score = new rendering.Score({
      config,
      log,
      musicXML: { scorePartwise },
      messageMeasures: this.messageMeasures,
    });
    const scoreRendering = score.render({ root, width });

    // Make playback sequences.
    const sequences = playback.Sequence.fromScoreRendering(scoreRendering);

    // Make locators.
    const renderingLocator = rendering.Locator.fromScoreRendering(scoreRendering);
    if (config.DEBUG_DRAW_TARGET_BOUNDS) {
      const ctx = scoreRendering.vexflow.renderer.getContext();
      renderingLocator.draw(ctx);
    }
    const timestampLocator = playback.TimestampLocator.create({ score: scoreRendering, sequences });

    // Initialize event routing.
    const overlay = root.getOverlay();
    const vexmlEventTopic = new events.Topic<rendering.EventMap>();
    const nativeEventTopic = new events.Topic<HTMLElementEventMap>();
    const scrollContainer = root.getScrollContainer();
    const overlayElement = overlay.getElement();
    const mappings = rendering.EventMappingFactory.create({
      scrollContainer,
      overlayElement,
      renderingLocator,
      timestampLocator,
      inputType: config.INPUT_TYPE,
      topic: vexmlEventTopic,
    });
    const bridge = new events.NativeBridge<keyof rendering.EventMap>({
      scrollContainer,
      overlayElement,
      mappings,
      nativeEventTopic,
      nativeEventOpts: {
        touchstart: { passive: true },
        touchmove: { passive: true },
        touchcancel: { passive: true },
        touchend: { passive: true },
      },
    });

    return new rendering.Rendering({
      config,
      log,
      score: scoreRendering,
      topic: vexmlEventTopic,
      bridge,
      root,
      sequences,
      partIds: scoreRendering.partIds,
    });
  }

  /** Returns the document string. */
  getDocumentString(): string {
    return this.musicXML.getDocumentString();
  }
}
