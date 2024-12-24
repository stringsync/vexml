export type VexmlErrorCode =
  | 'GENERIC_ERROR'
  | 'PARSE_ERROR'
  | 'PRE_RENDER_ERROR'
  | 'RENDER_ERROR'
  | 'POST_RENDER_ERROR'
  | 'PLAYBACK_ERROR';

/** A generic vexml error.  */
export class VexmlError extends Error {
  public readonly code: VexmlErrorCode;

  constructor(message: string, code: VexmlErrorCode = 'GENERIC_ERROR') {
    super(message);
    this.name = 'VexmlError';
    this.code = code;
  }
}

/** An error thrown during the parsing process. */
export class ParseError extends VexmlError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}

/** An error thrown during the pre-rendering process. */
export class PreRenderError extends VexmlError {
  constructor(message: string) {
    super(message, 'PRE_RENDER_ERROR');
    this.name = 'PreRenderError';
  }
}

/** An error thrown during the rendering process. */
export class RenderError extends VexmlError {
  constructor(message: string) {
    super(message, 'RENDER_ERROR');
    this.name = 'RenderError';
  }
}

/** An error thrown during the post-rendering process. */
export class PostRenderError extends VexmlError {
  constructor(message: string) {
    super(message, 'POST_RENDER_ERROR');
    this.name = 'PostRenderError';
  }
}

/** An error thrown during playback. */
export class PlaybackError extends VexmlError {
  constructor(message: string) {
    super(message, 'PLAYBACK_ERROR');
    this.name = 'PlaybackError';
  }
}
