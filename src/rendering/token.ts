import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

/** The result of rendering a token. */
export type TokenRendering = {
  type: 'token';
  vexflow: {
    annotation: vexflow.Annotation;
  };
};

/** Represents a word or a symbol being rendered. */
export class Token {
  private musicXML: {
    token: musicxml.Words | musicxml.Symbolic;
  };

  constructor(opts: {
    musicXML: {
      token: musicxml.Words | musicxml.Symbolic;
    };
  }) {
    this.musicXML = opts.musicXML;
  }

  render(): TokenRendering {
    const text = this.getContent();
    const annotation = new vexflow.Annotation(text);

    return {
      type: 'token',
      vexflow: {
        annotation,
      },
    };
  }

  private getContent(): string {
    const token = this.musicXML.token;
    if (token instanceof musicxml.Words) {
      return token.getContent();
    }
    if (token instanceof musicxml.Symbolic) {
      return token.getSmulfGlyphName();
    }
    return '';
  }
}
