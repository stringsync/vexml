import * as vexml from '@/index';

/** A MusicXML data source. */
export type Source =
  | {
      type: 'local';
      musicXML: string;
      config: vexml.LegacyConfig;
    }
  | {
      type: 'remote';
      url: string;
      config: vexml.LegacyConfig;
    }
  | {
      type: 'example';
      path: string;
      config: vexml.LegacyConfig;
    };

/** A wrapper for keying values. */
export type Keyed<T> = {
  key: string;
  value: T;
};
