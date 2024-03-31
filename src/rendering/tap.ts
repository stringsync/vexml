import * as vexflow from 'vexflow';

/** The result of rendering a tap. */
export type TapRendering = {
  type: 'tap';
  vexflow: {
    annotation: vexflow.Annotation;
  };
};

/** Indicates a tap on the fretboard. */
export class Tap {
  render(): TapRendering {
    const vfAnnotation = new vexflow.Annotation('T');
    return {
      type: 'tap',
      vexflow: {
        annotation: vfAnnotation,
      },
    };
  }
}
