import { Config } from '@/config';
import * as debug from '@/debug';
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
  private config: Config;
  private log: debug.Logger;
  private musicXML: {
    token: musicxml.Words | musicxml.Symbolic;
  };

  constructor(opts: {
    config: Config;
    log: debug.Logger;
    musicXML: {
      token: musicxml.Words | musicxml.Symbolic;
    };
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.musicXML = opts.musicXML;
  }

  render(): TokenRendering {
    const text = this.getContent();

    this.log.debug('rendering token', { text });

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
