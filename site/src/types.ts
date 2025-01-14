import * as vexml from '@/index';

/** A MusicXML data source. */
export type Source =
  | {
      type: 'local';
      musicXML: string;
      config: vexml.Config;
    }
  | {
      type: 'remote';
      url: string;
      config: vexml.Config;
    }
  | {
      type: 'example';
      path: string;
      config: vexml.Config;
    };

/** A wrapper for keying values. */
export type Keyed<T> = {
  key: string;
  value: T;
};
