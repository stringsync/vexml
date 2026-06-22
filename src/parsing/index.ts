// Production parsing is powered by the mdom adapter (@stringsync/mdom). The class names are kept for API compatibility:
// `MusicXMLParser`/`MXLParser` still parse MusicXML/MXL, now by reading mdom instead of the @/musicxml DOM wrappers.
// The legacy readers remain importable from '@/parsing/musicxml' and '@/parsing/mxl' for the IR-equivalence test.
export { MdomParser as MusicXMLParser, type MdomParserOptions as MusicXMLParserOptions } from './mdom';
export { MdomMXLParser as MXLParser, type MdomMXLParserOptions as MXLParserOptions } from './mdom';
