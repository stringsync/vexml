import * as vexflow from 'vexflow';
import * as data from '@/data';
import * as util from '@/util';
import { Logger } from '@/debug';
import { Config } from '@/config';
import {
  ArticulationKey,
  ArticulationRender,
  BeamKey,
  BeamRender,
  BendRender,
  GraceCurve,
  NoteRender,
  VoiceEntryKey,
} from './types';
import { Document } from './document';
import { Rect } from '@/spatial';
import { Beam } from './beam';
import { Articulation } from './articulation';
import { Bend } from './bend';

const GRACE_TAB_NOTE_FONT_SIZE = 7;

type NoteGraceComponents = {
  vexflowGraceNoteGroup: vexflow.GraceNoteGroup | null;
  graceBeamRenders: BeamRender[];
  graceCurves: GraceCurve[];
};

export class Note {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(): NoteRender {
    const voiceEntry = this.document.getVoiceEntry(this.key);
    util.assert(voiceEntry.type === 'note' || voiceEntry.type === 'chord', 'expected note or chord');

    const { autoStem, stemDirection } = this.getVexflowStemParams(voiceEntry);
    const curveIds = this.getCurveIds(voiceEntry);

    const isTabStave = this.document.isTabStave(this.key);

    let vexflowNote: vexflow.Note;
    if (isTabStave) {
      vexflowNote = new vexflow.TabNote({
        positions: this.getVexflowTabNotePositions(voiceEntry),
        duration: voiceEntry.durationType,
        dots: voiceEntry.dotCount,
      });
      vexflowNote.renderOptions.drawStem = this.config.SHOW_TAB_STEMS;
    } else {
      vexflowNote = new vexflow.StaveNote({
        keys: this.getVexflowStaveNoteKeys(voiceEntry),
        duration: voiceEntry.durationType,
        dots: voiceEntry.dotCount,
        autoStem,
        stemDirection,
        clef: this.document.getStave(this.key).signature.clef.sign,
      });
    }

    if (!isTabStave) {
      for (let index = 0; index < voiceEntry.dotCount; index++) {
        vexflow.Dot.buildAndAttach([vexflowNote], { all: true });
      }
    }

    if (!isTabStave) {
      this.renderVexflowAccidentals(vexflowNote, voiceEntry);
    }

    this.renderVexflowAnnotations(vexflowNote, voiceEntry);

    let vexflowGraceNoteGroup: vexflow.GraceNoteGroup | null = null;
    let graceBeamRenders = new Array<BeamRender>();
    let graceCurves = new Array<GraceCurve>();
    if (isTabStave) {
      const tabGraceEntries = this.renderTabGraceComponents(vexflowNote, voiceEntry);
      vexflowGraceNoteGroup = tabGraceEntries.vexflowGraceNoteGroup;
      graceBeamRenders = tabGraceEntries.graceBeamRenders;
      graceCurves = tabGraceEntries.graceCurves;
    } else {
      const staveGraceEntries = this.renderStaveGraceComponents(vexflowNote, voiceEntry);
      vexflowGraceNoteGroup = staveGraceEntries.vexflowGraceNoteGroup;
      graceBeamRenders = staveGraceEntries.graceBeamRenders;
      graceCurves = staveGraceEntries.graceCurves;
    }

    const articulationRenders = this.renderArticulations(vexflowNote);
    const bendRenders = this.renderBends(vexflowNote);

    return {
      type: 'note',
      subtype: voiceEntry.type,
      key: this.key,
      rect: Rect.empty(), // placeholder
      stemDirection: voiceEntry.stemDirection,
      vexflowNote: vexflowNote,
      curveIds,
      graceCurves,
      beamId: voiceEntry.beamId,
      wedgeId: voiceEntry.wedgeId,
      tupletIds: voiceEntry.tupletIds,
      vexflowGraceNoteGroup,
      graceBeamRenders,
      pedalMark: voiceEntry.pedalMark,
      octaveShiftId: voiceEntry.octaveShiftId,
      vibratoIds: voiceEntry.vibratoIds,
      articulationRenders,
      bendRenders,
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

  private getOctaveShift(): number {
    let result = 0;

    // Octave shift from clef.
    result += this.document.getStave(this.key).signature.clef.octaveShift ?? 0;

    // Octave shift from spanner.
    const voiceEntry = this.document.getVoiceEntry(this.key);
    if (voiceEntry.type === 'note' && voiceEntry.octaveShiftId) {
      const key = this.document.getOctaveShiftKey(voiceEntry.octaveShiftId);
      const octaveShift = this.document.getOctaveShift(key);
      const size = Math.abs(octaveShift.size) - 1;
      const octaveCount = Math.floor(size / 7);
      if (octaveShift.size < 0) {
        result += octaveCount;
      } else {
        result -= octaveCount;
      }
    }

    return result;
  }

  private getVexflowTabNotePositions(voiceEntry: data.Note | data.Chord): vexflow.TabNotePosition[] {
    switch (voiceEntry.type) {
      case 'note':
        return voiceEntry.tabPositions.map((t) => this.toVexflowTabNotePosition(t));
      case 'chord':
        return voiceEntry.notes.flatMap((note) => note.tabPositions).map((t) => this.toVexflowTabNotePosition(t));
    }
  }

  private toVexflowTabNotePosition(tabPosition: data.TabPosition): vexflow.TabNotePosition {
    const fret = tabPosition.harmonic ? `<${tabPosition.fret}>` : tabPosition.fret;
    return { str: tabPosition.string, fret };
  }

  private getVexflowStaveNoteKeys(voiceEntry: data.Note | data.Chord): string[] {
    const octaveShift = this.getOctaveShift();

    switch (voiceEntry.type) {
      case 'note':
        return [this.getVexflowNoteKey(voiceEntry, octaveShift)];
      case 'chord':
        return voiceEntry.notes.map((note) => this.getVexflowNoteKey(note, octaveShift));
    }
  }

  private getVexflowNoteKey(
    note: data.Note | data.ChordNote | data.GraceNote | data.GraceChordNote,
    octaveShift: number
  ): string {
    const step = note.pitch.step;
    const octave = note.pitch.octave - octaveShift;
    return note.head ? `${step}/${octave}/${note.head}` : `${step}/${octave}`;
  }

  private renderVexflowAnnotations(
    vexflowNote: vexflow.Note,
    voiceEntry: data.Note | data.Chord
  ): vexflow.Annotation[] {
    const vexflowAnnotations = new Array<vexflow.Annotation>();

    for (const annotation of voiceEntry.annotations) {
      const vexflowAnnotation = new vexflow.Annotation(annotation.text);
      vexflowAnnotations.push(vexflowAnnotation);

      if (annotation.horizontalJustification) {
        vexflowAnnotation.setJustification(annotation.horizontalJustification);
      }
      if (annotation.verticalJustification) {
        vexflowAnnotation.setVerticalJustification(annotation.verticalJustification);
      }
      vexflowNote.addModifier(vexflowAnnotation);
    }

    return vexflowAnnotations;
  }

  /**
   * Returns the vexflow.Accidental objects preserving the note index.
   */
  private renderVexflowAccidentals(
    vexflowNote: vexflow.Note,
    voiceEntry: data.Note | data.Chord
  ): Array<vexflow.Accidental | null> {
    const vexflowAccidentals = new Array<vexflow.Accidental | null>();

    switch (voiceEntry.type) {
      case 'note':
        vexflowAccidentals.push(this.renderVexflowAccidental(voiceEntry.accidental));
        break;
      case 'chord':
        vexflowAccidentals.push(...voiceEntry.notes.map((note) => this.renderVexflowAccidental(note.accidental)));
        break;
    }

    for (let index = 0; index < vexflowAccidentals.length; index++) {
      const vexflowAccidental = vexflowAccidentals[index];
      if (vexflowAccidental) {
        vexflowNote.addModifier(vexflowAccidental, index);
      }
    }

    return vexflowAccidentals;
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

  private renderTabGraceComponents(vexflowNote: vexflow.Note, voiceEntry: data.Note | data.Chord): NoteGraceComponents {
    if (voiceEntry.graceEntries.length === 0) {
      return { vexflowGraceNoteGroup: null, graceBeamRenders: [], graceCurves: [] };
    }

    const registry = new Map<string, vexflow.StemmableNote[]>();

    const graceCurves = new Array<GraceCurve>();
    const vexflowGraceTabNotes = new Array<vexflow.GraceTabNote>();

    for (let graceEntryIndex = 0; graceEntryIndex < voiceEntry.graceEntries.length; graceEntryIndex++) {
      const graceEntry = voiceEntry.graceEntries[graceEntryIndex];

      const positions = new Array<vexflow.TabNotePosition>();
      switch (graceEntry.type) {
        case 'gracenote':
          positions.push(...graceEntry.tabPositions.map((tabPosition) => this.toVexflowTabNotePosition(tabPosition)));
          break;
        case 'gracechord':
          positions.push(
            ...graceEntry.notes
              .flatMap((note) => note.tabPositions)
              .map((tabPosition) => this.toVexflowTabNotePosition(tabPosition))
          );
          break;
      }

      const vexflowGraceTabNote = new HackedVexflowGraceTabNote({
        positions: positions,
        duration: graceEntry.durationType,
      }).setFontSize(GRACE_TAB_NOTE_FONT_SIZE);
      vexflowGraceTabNote.renderOptions.yShift--;
      vexflowGraceTabNotes.push(vexflowGraceTabNote);

      if (graceEntry.beamId) {
        if (!registry.has(graceEntry.beamId)) {
          registry.set(graceEntry.beamId, []);
        }
        registry.get(graceEntry.beamId)!.push(vexflowGraceTabNote);
      }

      const curveIds = new Array<string>();
      switch (graceEntry.type) {
        case 'gracenote':
          curveIds.push(...graceEntry.curveIds);
          break;
        case 'gracechord':
          curveIds.push(...graceEntry.notes.flatMap((note) => note.curveIds));
          break;
      }
      for (const curveId of curveIds) {
        graceCurves.push({ curveId, graceEntryIndex });
      }
    }

    const vexflowGraceNoteGroup = new vexflow.GraceNoteGroup(vexflowGraceTabNotes);
    vexflowGraceNoteGroup.setNote(vexflowNote);
    vexflowGraceNoteGroup.setPosition(vexflow.Modifier.Position.LEFT);
    vexflowNote.addModifier(vexflowGraceNoteGroup);

    // Grace notes cannot span voice entries, so we perform all the beaming here.
    const beams = this.document.getBeams(this.key);
    const beamKeys = Array.from(registry.keys()).map<BeamKey>((beamId) => ({
      ...this.key,
      beamIndex: beams.findIndex((beam) => beam.id === beamId),
    }));

    const graceBeamRenders = beamKeys.map((beamKey) =>
      new Beam(this.config, this.log, this.document, beamKey, registry).render()
    );

    return { vexflowGraceNoteGroup, graceBeamRenders, graceCurves };
  }

  private renderStaveGraceComponents(
    vexflowNote: vexflow.Note,
    voiceEntry: data.Note | data.Chord
  ): NoteGraceComponents {
    if (voiceEntry.graceEntries.length === 0) {
      return { vexflowGraceNoteGroup: null, graceBeamRenders: [], graceCurves: [] };
    }

    const registry = new Map<string, vexflow.StemmableNote[]>();

    const octaveShift = this.document.getStave(this.key).signature.clef.octaveShift ?? 0;

    const graceCurves = new Array<GraceCurve>();
    const vexflowGraceNotes = new Array<vexflow.GraceNote>();

    for (let graceEntryIndex = 0; graceEntryIndex < voiceEntry.graceEntries.length; graceEntryIndex++) {
      const graceEntry = voiceEntry.graceEntries[graceEntryIndex];

      const keys = new Array<string>();
      switch (graceEntry.type) {
        case 'gracenote':
          keys.push(this.getVexflowNoteKey(graceEntry, octaveShift));
          break;
        case 'gracechord':
          keys.push(...graceEntry.notes.map((note) => this.getVexflowNoteKey(note, octaveShift)));
          break;
      }

      let slash = false;
      switch (graceEntry.type) {
        case 'gracenote':
          slash = graceEntry.slash;
          break;
        case 'gracechord':
          slash = graceEntry.notes.some((note) => note.slash);
          break;
      }

      const vexflowGraceNote = new vexflow.GraceNote({
        keys: keys,
        duration: graceEntry.durationType,
        slash,
      });

      const vexflowAccidentals = new Array<vexflow.Accidental | null>();
      switch (graceEntry.type) {
        case 'gracenote':
          vexflowAccidentals.push(this.renderVexflowAccidental(graceEntry.accidental));
          break;
        case 'gracechord':
          vexflowAccidentals.push(...graceEntry.notes.map((note) => this.renderVexflowAccidental(note.accidental)));
          break;
      }

      for (let index = 0; index < vexflowAccidentals.length; index++) {
        const vexflowAccidental = vexflowAccidentals[index];
        if (vexflowAccidental) {
          vexflowGraceNote.addModifier(vexflowAccidental, index);
        }
      }

      vexflowGraceNotes.push(vexflowGraceNote);

      if (graceEntry.beamId) {
        if (!registry.has(graceEntry.beamId)) {
          registry.set(graceEntry.beamId, []);
        }
        registry.get(graceEntry.beamId)!.push(vexflowGraceNote);
      }

      const curveIds = new Array<string>();
      switch (graceEntry.type) {
        case 'gracenote':
          curveIds.push(...graceEntry.curveIds);
          break;
        case 'gracechord':
          curveIds.push(...graceEntry.notes.flatMap((note) => note.curveIds));
          break;
      }
      for (const curveId of curveIds) {
        graceCurves.push({ curveId, graceEntryIndex });
      }
    }

    const vexflowGraceNoteGroup = new vexflow.GraceNoteGroup(vexflowGraceNotes);
    vexflowGraceNoteGroup.setNote(vexflowNote);
    vexflowGraceNoteGroup.setPosition(vexflow.Modifier.Position.LEFT);
    vexflowNote.addModifier(vexflowGraceNoteGroup);

    // Grace notes cannot span voice entries, so we perform all the beaming here.
    const beams = this.document.getBeams(this.key);
    const beamKeys = Array.from(registry.keys()).map<BeamKey>((beamId) => ({
      ...this.key,
      beamIndex: beams.findIndex((beam) => beam.id === beamId),
    }));

    const graceBeamRenders = beamKeys.map((beamKey) =>
      new Beam(this.config, this.log, this.document, beamKey, registry).render()
    );

    return { vexflowGraceNoteGroup, graceBeamRenders, graceCurves };
  }

  private renderArticulations(vexflowNote: vexflow.Note): ArticulationRender[] {
    const articulationRenders = new Array<ArticulationRender>();

    const articulations = this.document.getArticulations(this.key);
    for (let articulationIndex = 0; articulationIndex < articulations.length; articulationIndex++) {
      const key: ArticulationKey = { ...this.key, articulationIndex };

      const articulationRender = new Articulation(this.config, this.log, this.document, key).render();
      articulationRenders.push(articulationRender);
    }

    for (const articulationRender of articulationRenders) {
      for (const vexflowModifier of articulationRender.vexflowModifiers) {
        vexflowNote.addModifier(vexflowModifier);
      }
    }

    return articulationRenders;
  }

  private renderBends(vexflowNote: vexflow.Note): BendRender[] {
    const bendRenders = new Array<BendRender>();

    const voiceEntry = this.document.getVoiceEntry(this.key);
    const isBendable = voiceEntry.type === 'note' || voiceEntry.type === 'chord';
    const hasBends = isBendable && voiceEntry.bends.length > 0;
    if (hasBends) {
      const bendRender = new Bend(this.config, this.log, this.document, this.key).render();
      bendRenders.push(bendRender);
    }

    for (const bendRender of bendRenders) {
      for (const vexflowModifier of bendRender.vexflowModifiers) {
        vexflowNote.addModifier(vexflowModifier);
      }
    }

    return bendRenders;
  }
}

// See https://github.com/vexflow/vexflow/issues/255
class HackedVexflowGraceTabNote extends vexflow.GraceTabNote {
  setFontSize(size?: string | number): this {
    for (const fretElement of this.fretElement) {
      fretElement.setFontSize(size);
    }
    return this;
  }
}
