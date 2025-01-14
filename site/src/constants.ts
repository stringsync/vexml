import * as vexml from '@/index';

export const VEXML_VERSION = VITE_VEXML_VERSION;

export const LOCAL_STORAGE_VEXML_SOURCES_KEY = 'vexml:sources';

const LOCAL_STORAGE_SAVED_MUSICXML_KEY = 'vexml:saved_musicxml';
const LOCAL_STORAGE_USE_DEFAULT_MUSICXML_KEY = 'vexml:use_default_musicxml';
export const DEPRECATED_LOCAL_STORAGE_KEYS = [LOCAL_STORAGE_SAVED_MUSICXML_KEY, LOCAL_STORAGE_USE_DEFAULT_MUSICXML_KEY];

export const EXAMPLES = Object.entries(import.meta.glob('./examples/**/*.musicxml', { as: 'raw' })).map(
  ([path, get]) => ({ path, get })
);

export const DEFAULT_EXAMPLE_PATH = './examples/lilypond/01a-Pitches-Pitches.musicxml';

export const DEFAULT_CONFIG: vexml.Config = {
  ...vexml.DEFAULT_CONFIG,
  HEIGHT: 300,
};
