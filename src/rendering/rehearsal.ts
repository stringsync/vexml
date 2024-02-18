import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering a rehearsal. */
export type RehearsalRendering = {
  type: 'rehearsal';
  vexflow: {
    annotation: vexflow.Annotation;
  };
};

/** Represents an indicator denoting a certain point in a score. */
export class Rehearsal {
  private musicXML: { rehearsal: musicxml.Rehearsal };

  constructor(opts: { musicXML: { rehearsal: musicxml.Rehearsal } }) {
    this.musicXML = opts.musicXML;
  }

  /** Renders the rehearsal. */
  render(): RehearsalRendering {
    return {
      type: 'rehearsal',
      vexflow: {
        annotation: new vexflow.Annotation(this.musicXML.rehearsal.getText())
          .setFont('Times New Roman', 16)
          .setVerticalJustification(vexflow.Annotation.VerticalJustify.TOP),
      },
    };
  }
}
