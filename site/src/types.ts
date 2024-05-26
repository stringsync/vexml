/** A MusicXML data source. */
export type Source =
  | {
      type: 'local';
      musicXML: string;
    }
  | {
      type: 'remote';
      url: string;
    }
  | {
      type: 'example';
      path: string;
    };

/** A wrapper for keying values. */
export type Keyed<T> = {
  key: string;
  value: T;
};
