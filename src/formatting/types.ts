import * as data from '@/data';

/** Formatter produces a new formatted document from an unformatted one. */
export interface Formatter {
  format(document: data.Document): data.Document;
}
