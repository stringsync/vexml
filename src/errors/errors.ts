export type VexmlErrorCode = 'GENERIC_ERROR' | 'DOCUMENT_ERROR' | 'PARSE_ERROR';

/** A generic vexml error.  */
export class VexmlError extends Error {
  public readonly code: VexmlErrorCode;

  constructor(message: string, code: VexmlErrorCode = 'GENERIC_ERROR') {
    super(message);
    this.name = 'VexmlError';
    this.code = code;
  }
}

/** An error thrown when attempting to mutate the document. */
export class DocumentError extends VexmlError {
  constructor(message: string) {
    super(message, 'DOCUMENT_ERROR');
    this.name = 'DocumentError';
  }
}

/** An error thrown during the parsing process. */
export class ParseError extends VexmlError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}
