/** A MusicXML data source. */
export type Source =
  | {
      type: 'remote';
      url: string;
    }
  | {
      type: 'raw';
      musicXML: string;
    };

/** A wrapper for keying values. */
export type Keyed<T> = {
  key: string;
  value: T;
};
