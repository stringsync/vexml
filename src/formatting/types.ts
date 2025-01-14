import * as data from '@/data';
import * as rendering from '@/rendering';

/** Formatter produces a new formatted document from an unformatted one. */
export interface Formatter {
  format(config: rendering.Config, document: data.Document): data.Document;
}
