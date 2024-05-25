/** A MusicXML data source. */
export type Source =
  | {
      type: 'raw';
      musicXML: string;
    }
  | {
      type: 'remote';
      url: string;
    }
  | {
      type: 'example';
      example:
        | {
            type: 'none';
          }
        | {
            type: 'single';
            path: string;
          };
    };

/** A wrapper for keying values. */
export type Keyed<T> = {
  key: string;
  value: T;
};
