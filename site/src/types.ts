/**
 * A source of MusicXML data.
 */
export type Source =
  | {
      type: 'none';
    }
  | {
      type: 'remote';
      key: string;
      url: string;
    }
  | {
      type: 'raw';
      key: string;
      musicXML: string;
    };
