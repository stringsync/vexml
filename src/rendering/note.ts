import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { NoteRender, VoiceEntryKey } from './types';
import { Document } from './document';
import { Rect } from '@/spatial';

export class Note {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(): NoteRender {
    const note = this.document.getNote(this.key);

    let autoStem: boolean | undefined;
    let stemDirection: number | undefined;

    switch (note.stemDirection) {
      case 'up':
        stemDirection = vexflow.Stem.UP;
        break;
      case 'down':
        stemDirection = vexflow.Stem.DOWN;
        break;
      case 'none':
        break;
      default:
        autoStem = true;
    }

    const clef = this.document.getStave(this.key).signature.clef;
    const octave = note.pitch.octave - (clef.octaveShift ?? 0);

    const vexflowStaveNote = new vexflow.StaveNote({
      keys: [`${note.pitch.step}/${octave}`],
      duration: note.durationType,
      dots: note.dotCount,
      autoStem,
      stemDirection,
      clef: clef.sign,
    });

    for (let index = 0; index < note.dotCount; index++) {
      vexflow.Dot.buildAndAttach([vexflowStaveNote]);
    }

    if (note.accidental) {
      const vexflowAccidental = new vexflow.Accidental(note.accidental.code);
      if (note.accidental.isCautionary) {
        vexflowAccidental.setAsCautionary();
      }
      vexflowStaveNote.addModifier(vexflowAccidental);
    }

    for (const annotation of note.annotations) {
      const vexflowAnnotation = new vexflow.Annotation(annotation.text);
      if (annotation.horizontalJustification) {
        vexflowAnnotation.setJustification(annotation.horizontalJustification);
      }
      if (annotation.verticalJustification) {
        vexflowAnnotation.setVerticalJustification(annotation.verticalJustification);
      }
      vexflowStaveNote.addModifier(vexflowAnnotation);
    }

    return {
      type: 'note',
      key: this.key,
      rect: Rect.empty(), // placeholder
      stemDirection: note.stemDirection,
      vexflowTickable: vexflowStaveNote,
      curveIds: note.curveIds,
      beamId: note.beamId,
    };
  }
}
