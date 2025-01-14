import * as data from '@/data';
import { Config } from '@/config';

/** Formatter produces a new formatted document from an unformatted one. */
export interface Formatter {
  format(config: Config, document: data.Document): data.Document;
}
