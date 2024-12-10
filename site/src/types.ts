import * as vexml from '@/index';

/** A MusicXML data source. */
export type Source =
  | {
      type: 'local';
      musicXML: string;
      backend: RenderingBackend;
      config: vexml.Config;
    }
  | {
      type: 'remote';
      url: string;
      backend: RenderingBackend;
      config: vexml.Config;
    }
  | {
      type: 'example';
      path: string;
      backend: RenderingBackend;
      config: vexml.Config;
    };

/** A wrapper for keying values. */
export type Keyed<T> = {
  key: string;
  value: T;
};

/** The modes for rendering vexml. */
export type RenderingBackend = 'svg' | 'canvas';

/** Cursors that assist with navigating the rendered notation. */
export type CursorInput = {
  id: string;
  color: string;
  partId?: string;
};
