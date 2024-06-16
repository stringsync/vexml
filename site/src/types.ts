/** A MusicXML data source. */
export type Source =
  | {
      type: 'local';
      musicXML: string;
      vexmlMode: VexmlMode;
    }
  | {
      type: 'remote';
      url: string;
      vexmlMode: VexmlMode;
    }
  | {
      type: 'example';
      path: string;
      vexmlMode: VexmlMode;
    };

/** A wrapper for keying values. */
export type Keyed<T> = {
  key: string;
  value: T;
};

/** The modes for rendering vexml. */
export type VexmlMode = 'svg' | 'canvas';
