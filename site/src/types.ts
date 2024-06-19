/** A MusicXML data source. */
export type Source =
  | {
      type: 'local';
      musicXML: string;
      backend: RenderingBackend;
    }
  | {
      type: 'remote';
      url: string;
      backend: RenderingBackend;
    }
  | {
      type: 'example';
      path: string;
      backend: RenderingBackend;
    };

/** A wrapper for keying values. */
export type Keyed<T> = {
  key: string;
  value: T;
};

/** The modes for rendering vexml. */
export type RenderingBackend = 'svg' | 'canvas';
