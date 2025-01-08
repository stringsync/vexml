import * as vexflow from 'vexflow';
import * as data from '@/data';
import * as util from '@/util';
import { Logger } from '@/debug';
import { Config } from './config';
import { NoteRender, VoiceEntryKey } from './types';
import { Document } from './document';
import { Rect } from '@/spatial';

export class Note {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(): NoteRender {
    const voiceEntry = this.document.getVoiceEntry(this.key);
    util.assert(voiceEntry.type === 'note' || voiceEntry.type === 'chord', 'expected note or chord');

    const { autoStem, stemDirection } = this.getVexflowStemParams(voiceEntry);
    const curveIds = this.getCurveIds(voiceEntry);
    const keys = this.getVexflowStaveNoteKeys(voiceEntry);

    const vexflowStaveNote = new vexflow.StaveNote({
      keys,
      duration: voiceEntry.durationType,
      dots: voiceEntry.dotCount,
      autoStem,
      stemDirection,
      clef: this.document.getStave(this.key).signature.clef.sign,
    });

    for (let index = 0; index < voiceEntry.dotCount; index++) {
      vexflow.Dot.buildAndAttach([vexflowStaveNote], { all: true });
    }

    const vexflowAccidentals = this.getVexflowAccidentals(voiceEntry);
    for (let index = 0; index < vexflowAccidentals.length; index++) {
      const vexflowAccidental = vexflowAccidentals[index];
      if (vexflowAccidental) {
        vexflowStaveNote.addModifier(vexflowAccidental, index);
      }
    }

    for (const annotation of voiceEntry.annotations) {
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
      stemDirection: voiceEntry.stemDirection,
      vexflowTickable: vexflowStaveNote,
      curveIds,
      beamId: voiceEntry.beamId,
    };
  }

  private getCurveIds(voiceEntry: data.Note | data.Chord): string[] {
    switch (voiceEntry.type) {
      case 'note':
        return voiceEntry.curveIds;
      case 'chord':
        return voiceEntry.notes.flatMap((note) => note.curveIds);
    }
  }

  private getVexflowStemParams(voiceEntry: data.Note | data.Chord): {
    autoStem: boolean | undefined;
    stemDirection: number | undefined;
  } {
    let autoStem: boolean | undefined;
    let stemDirection: number | undefined;

    switch (voiceEntry.stemDirection) {
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

    return { autoStem, stemDirection };
  }

  private getVexflowStaveNoteKeys(voiceEntry: data.Note | data.Chord): string[] {
    const octaveShift = this.document.getStave(this.key).signature.clef.octaveShift ?? 0;

    switch (voiceEntry.type) {
      case 'note':
        return [`${voiceEntry.pitch.step}/${voiceEntry.pitch.octave - octaveShift}`];
      case 'chord':
        return voiceEntry.notes.map((note) => `${note.pitch.step}/${note.pitch.octave - octaveShift}`);
    }
  }

  /**
   * Returns the vexflow.Accidental objects preserving the note index.
   */
  private getVexflowAccidentals(voiceEntry: data.Note | data.Chord): Array<vexflow.Accidental | null> {
    switch (voiceEntry.type) {
      case 'note':
        return [this.getVexflowAccidental(voiceEntry.accidental)];
      case 'chord':
        return voiceEntry.notes.map((note) => this.getVexflowAccidental(note.accidental));
    }
  }

  private getVexflowAccidental(accidental: data.Accidental | null): vexflow.Accidental | null {
    if (!accidental) {
      return null;
    }

    const vexflowAccidental = new vexflow.Accidental(accidental.code);
    if (accidental.isCautionary) {
      vexflowAccidental.setAsCautionary();
    }

    return vexflowAccidental;
  }
}
