import { Document } from './document';

/**
 * Parser is an interface for extracting a {@link Document} from a data source.
 *
 * @example
 * ```ts
 * class MusicXMLParser implements Parser {
 *   parse(data: string): Document {
 *     // Parse the MusicXML data and return a Document.
 *   }
 * }
 * ```
 */
export interface Parser {
  parse(data: string): Document;
}
