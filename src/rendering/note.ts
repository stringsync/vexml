import * as vexflow from 'vexflow';
import * as data from '@/data';
import * as util from '@/util';
import { Logger } from '@/debug';
import { Config } from './config';
import { BeamKey, BeamRender, NoteRender, VoiceEntryKey } from './types';
import { Document } from './document';
import { Rect } from '@/spatial';
import { Beam } from './beam';

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

    const vexflowAccidentals = this.renderVexflowAccidentals(voiceEntry);
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

    const { vexflowGraceNoteGroup, graceBeamRenders } = this.renderGraceEntries(voiceEntry);
    if (vexflowGraceNoteGroup) {
      vexflowGraceNoteGroup.setNote(vexflowStaveNote);
      vexflowGraceNoteGroup.setPosition(vexflow.Modifier.Position.LEFT);
      vexflowStaveNote.addModifier(vexflowGraceNoteGroup);
    }

    return {
      type: 'note',
      key: this.key,
      rect: Rect.empty(), // placeholder
      stemDirection: voiceEntry.stemDirection,
      vexflowTickable: vexflowStaveNote,
      curveIds,
      beamId: voiceEntry.beamId,
      tupletIds: voiceEntry.tupletIds,
      vexflowGraceNoteGroup,
      graceBeamRenders,
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
        return [this.getVexflowNoteKey(voiceEntry, octaveShift)];
      case 'chord':
        return voiceEntry.notes.map((note) => this.getVexflowNoteKey(note, octaveShift));
    }
  }

  private getVexflowNoteKey(note: data.Note | data.ChordNote | data.GraceNote, octaveShift: number): string {
    const step = note.pitch.step;
    const octave = note.pitch.octave - octaveShift;
    return note.head ? `${step}/${octave}/${note.head}` : `${step}/${octave}`;
  }

  /**
   * Returns the vexflow.Accidental objects preserving the note index.
   */
  private renderVexflowAccidentals(voiceEntry: data.Note | data.Chord): Array<vexflow.Accidental | null> {
    switch (voiceEntry.type) {
      case 'note':
        return [this.renderVexflowAccidental(voiceEntry.accidental)];
      case 'chord':
        return voiceEntry.notes.map((note) => this.renderVexflowAccidental(note.accidental));
    }
  }

  private renderVexflowAccidental(accidental: data.Accidental | null): vexflow.Accidental | null {
    if (!accidental) {
      return null;
    }

    const vexflowAccidental = new vexflow.Accidental(accidental.code);
    if (accidental.isCautionary) {
      vexflowAccidental.setAsCautionary();
    }

    return vexflowAccidental;
  }

  private renderGraceEntries(voiceEntry: data.Note | data.Chord): {
    vexflowGraceNoteGroup: vexflow.GraceNoteGroup | null;
    graceBeamRenders: BeamRender[];
  } {
    if (voiceEntry.graceEntries.length === 0) {
      return { vexflowGraceNoteGroup: null, graceBeamRenders: [] };
    }

    const registry = new Map<string, vexflow.StemmableNote[]>();

    const octaveShift = this.document.getStave(this.key).signature.clef.octaveShift ?? 0;

    const vexflowGraceNotes = new Array<vexflow.GraceNote>();

    for (const graceEntry of voiceEntry.graceEntries) {
      const key = this.getVexflowNoteKey(graceEntry, octaveShift);
      const vexflowGraceNote = new vexflow.GraceNote({
        keys: [key],
        duration: graceEntry.durationType,
        slash: graceEntry.slash,
      });

      const vexflowAccidental = this.renderVexflowAccidental(graceEntry.accidental);
      if (vexflowAccidental) {
        vexflowGraceNote.addModifier(vexflowAccidental);
      }

      vexflowGraceNotes.push(vexflowGraceNote);

      if (graceEntry.beamId) {
        if (!registry.has(graceEntry.beamId)) {
          registry.set(graceEntry.beamId, []);
        }
        registry.get(graceEntry.beamId)!.push(vexflowGraceNote);
      }
    }

    const vexflowGraceNoteGroup = new vexflow.GraceNoteGroup(vexflowGraceNotes);

    // Grace notes cannot span voice entries, so we perform all the beaming here.
    const beams = this.document.getBeams(this.key);
    const beamKeys = Array.from(registry.keys()).map<BeamKey>((beamId) => ({
      ...this.key,
      beamIndex: beams.findIndex((beam) => beam.id === beamId),
    }));

    const graceBeamRenders = beamKeys.map((beamKey) =>
      new Beam(this.config, this.log, this.document, beamKey, registry).render()
    );

    return { vexflowGraceNoteGroup, graceBeamRenders };
  }
}
