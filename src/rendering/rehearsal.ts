import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import { Config } from './config';

/** The result of rendering a rehearsal. */
export type RehearsalRendering = {
  type: 'rehearsal';
  vexflow: {
    annotation: vexflow.Annotation;
  };
};

/** Represents an indicator denoting a certain point in a score. */
export class Rehearsal {
  private config: Config;
  private musicXML: { rehearsal: musicxml.Rehearsal };

  constructor(opts: { config: Config; musicXML: { rehearsal: musicxml.Rehearsal } }) {
    this.config = opts.config;
    this.musicXML = opts.musicXML;
  }

  /** Renders the rehearsal. */
  render(): RehearsalRendering {
    return {
      type: 'rehearsal',
      vexflow: {
        annotation: new vexflow.Annotation(this.musicXML.rehearsal.getText())
          .setFont(this.config.REHEARSAL_FONT_FAMILY, this.config.REHEARSAL_FONT_SIZE)
          .setVerticalJustification(vexflow.Annotation.VerticalJustify.TOP),
      },
    };
  }
}
