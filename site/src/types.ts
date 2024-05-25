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
      example: Example;
    };

/** An example from integration tests */
export type Example =
  | {
      type: 'none';
    }
  | {
      type: 'single';
      path: string;
    };

/** A wrapper for keying values. */
export type Keyed<T> = {
  key: string;
  value: T;
};
