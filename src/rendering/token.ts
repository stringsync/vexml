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
  private content: musicxml.Words | musicxml.Symbolic;

  private constructor(opts: { content: musicxml.Words | musicxml.Symbolic }) {
    this.content = opts.content;
  }

  static create(opts: {
    musicXml: {
      token: musicxml.Words | musicxml.Symbolic;
    };
  }) {
    return new Token({ content: opts.musicXml.token });
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
    if (this.content instanceof musicxml.Words) {
      return this.content.getContent();
    }
    if (this.content instanceof musicxml.Symbolic) {
      return this.content.getSmulfGlyphName();
    }
    return '';
  }
}
