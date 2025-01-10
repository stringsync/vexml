import * as vexflow from 'vexflow';
import * as util from '@/util';
import * as data from '@/data';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { CurveKey, CurveRender, NoteRender, VoiceEntryKey } from './types';

interface VexflowStaveNoteRegistry {
  get(curveId: string): NoteRender[] | undefined;
}

type Stem = 'up' | 'down' | 'none';

type CurveNote = {
  stem: Stem;
  rect: Rect;
  key: VoiceEntryKey;
  line: number;
  vexflowStaveNote: vexflow.StaveNote;
};

type CurvePlacement = 'above' | 'below';

export class Curve {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: CurveKey,
    private registry: VexflowStaveNoteRegistry
  ) {}

  render(): CurveRender {
    const curve = this.document.getCurve(this.key);
    const noteRenders = this.registry.get(curve.id);
    util.assertDefined(noteRenders);

    const curveNotes = this.getCurveNotes(noteRenders);

    // TODO: Figure out when the curve spans systems.
    const vexflowCurves = this.renderVexflowCurves(curveNotes);

    // Use getBoundingBox when it works.
    // See https://github.com/vexflow/vexflow/issues/252
    const rect = Rect.empty();

    return {
      type: 'curve',
      rect,
      key: this.key,
      vexflowCurves,
    };
  }

  private renderVexflowCurves(curveNotes: CurveNote[]): vexflow.Curve[] {
    const curve = this.document.getCurve(this.key);

    if (curveNotes.length < 2) {
      this.log.warn('Curve has less than 2 notes, rendering nothing.', { curveId: curve.id });
      return [];
    }

    const first = curveNotes.at(0)!;
    const last = curveNotes.at(-1)!;

    if (first.key.systemIndex !== last.key.systemIndex) {
      return this.renderVexflowCurvesAcrossSystems(curveNotes);
    }

    return [this.renderSingleVexflowCurve(curveNotes)];
  }

  private renderSingleVexflowCurve(curveNotes: CurveNote[]): vexflow.Curve {
    const firstCurveNote = curveNotes.at(0)!;
    const lastCurveNote = curveNotes.at(-1)!;

    return new vexflow.Curve(
      firstCurveNote.vexflowStaveNote,
      lastCurveNote.vexflowStaveNote,
      this.getVexflowCurveNoteOptions(firstCurveNote, lastCurveNote)
    );
  }

  private renderVexflowCurvesAcrossSystems(curveNotes: CurveNote[]): vexflow.Curve[] {
    const vexflowCurves = new Array<vexflow.Curve>();

    const systemIndexes = util.unique(curveNotes.map((note) => note.key.systemIndex));
    for (let index = 0; index < systemIndexes.length - 1; index++) {
      const startSystemIndex = systemIndexes[index];
      const isFirst = index === 0;
      const isLast = index === systemIndexes.length - 1;

      const systemCurveNotes = curveNotes.filter((note) => note.key.systemIndex === startSystemIndex);
      const firstCurveNote = systemCurveNotes.at(0)!;
      const lastCurveNote = systemCurveNotes.at(-1)!;

      if (isFirst) {
        const vexflowCurve = new vexflow.Curve(
          firstCurveNote.vexflowStaveNote,
          undefined,
          this.getVexflowCurveNoteOptions(firstCurveNote, undefined)
        );
        vexflowCurves.push(vexflowCurve);
      } else if (isLast) {
        const vexflowCurve = new vexflow.Curve(
          undefined,
          lastCurveNote.vexflowStaveNote,
          this.getVexflowCurveNoteOptions(undefined, lastCurveNote)
        );
        vexflowCurves.push(vexflowCurve);
      } else {
        // It's an exceptional case when a curve spans more than 2 systems. For now, we'll just render a curve that
        // starts and ends on the entire system.
        // TODO: Render the curve from the beginning of the stave to the end of the stave instead of using the
        // notes as anchor points.
        const vexflowCurve = new vexflow.Curve(
          firstCurveNote.vexflowStaveNote,
          lastCurveNote.vexflowStaveNote,
          this.getVexflowCurveNoteOptions(firstCurveNote, lastCurveNote)
        );
        vexflowCurves.push(vexflowCurve);
      }
    }

    return vexflowCurves;
  }

  private getVexflowCurveNoteOptions(first: CurveNote | undefined, last: CurveNote | undefined): vexflow.CurveOptions {
    if (!first && !last) {
      return {};
    }
    if (first && !last) {
      return { position: vexflow.CurvePosition.NEAR_HEAD };
    }
    if (!first && last) {
      return { positionEnd: vexflow.CurvePosition.NEAR_HEAD };
    }

    util.assertDefined(first);
    util.assertDefined(last);

    const prescribedPlacement = this.document.getCurve(this.key).placement;

    const entry1 = this.document.getVoiceEntry(first.key);
    const entry2 = this.document.getVoiceEntry(last.key);
    const isTie =
      entry1.type === 'note' &&
      entry2.type === 'note' &&
      entry1.pitch.step === entry2.pitch.step &&
      entry1.pitch.octave === entry2.pitch.octave;
    if (isTie && prescribedPlacement === 'auto') {
      return {
        position: vexflow.CurvePosition.NEAR_HEAD,
        positionEnd: vexflow.CurvePosition.NEAR_HEAD,
        openingDirection: 'auto',
      };
    }

    const placement = this.getCurvePlacement(prescribedPlacement, first);

    const position = this.getVexflowCurvePosition(placement, first);
    const positionEnd = this.getVexflowCurvePosition(placement, last);
    const openingDirection = this.getOpeningDirection(placement);

    return { position, positionEnd, openingDirection };
  }

  private getOpeningDirection(placement: CurvePlacement): data.CurveOpening {
    const opening = this.document.getCurve(this.key).opening;
    if (opening !== 'auto') {
      return opening;
    }
    if (placement === 'above') {
      return 'down';
    }
    if (placement === 'below') {
      return 'up';
    }
    return 'auto';
  }

  private getVexflowCurvePosition(placement: CurvePlacement, curveNote: CurveNote): vexflow.CurvePosition | undefined {
    if (placement === 'above' && curveNote.stem === 'up') {
      return vexflow.CurvePosition.NEAR_TOP;
    }
    if (placement === 'above' && curveNote.stem === 'down') {
      return vexflow.CurvePosition.NEAR_HEAD;
    }
    if (placement === 'below' && curveNote.stem === 'up') {
      return vexflow.CurvePosition.NEAR_HEAD;
    }
    if (placement === 'below' && curveNote.stem === 'down') {
      return vexflow.CurvePosition.NEAR_TOP;
    }
    if (curveNote.stem === 'none') {
      return vexflow.CurvePosition.NEAR_HEAD;
    }
    return undefined;
  }

  private getCurvePlacement(prescribedPlacement: data.CurvePlacement, first: CurveNote): CurvePlacement {
    if (prescribedPlacement !== 'auto') {
      return prescribedPlacement;
    }

    // Transform the 'auto' to a concrete placement.

    // If the first note has a stem, we use that to determine the placement.
    switch (first.stem) {
      case 'up':
        return 'above';
      case 'down':
        return 'below';
    }

    // Otherwise, we use positioning on the stave to determine placement.
    const lineCount = this.document.getStave(first.key).signature.lineCount;
    if (first.line > lineCount / 2) {
      // The note is above the halfway point on the stave.
      return 'above';
    } else {
      // The note is at or below the halfway point on the stave.
      return 'below';
    }
  }

  private getCurveNotes(noteRenders: NoteRender[]): CurveNote[] {
    const curveNotes = new Array<CurveNote>();

    for (const noteRender of noteRenders) {
      curveNotes.push({
        stem: this.getStem(noteRender.vexflowTickable),
        rect: noteRender.rect,
        key: noteRender.key,
        line: noteRender.vexflowTickable.getLineNumber(),
        vexflowStaveNote: noteRender.vexflowTickable,
      });

      const vexflowGraceNotes = noteRender.vexflowGraceNoteGroup?.getGraceNotes() ?? [];
      for (const graceCurve of noteRender.graceCurves) {
        const vexflowGraceNote = vexflowGraceNotes.at(graceCurve.graceEntryIndex);
        if (!vexflowGraceNote) {
          this.log.warn('grace note not found for curve, continuing', { curveId: this.key.curveIndex });
          continue;
        }
        if (!(vexflowGraceNote instanceof vexflow.StaveNote)) {
          continue;
        }

        curveNotes.push({
          stem: this.getStem(vexflowGraceNote),
          rect: noteRender.rect,
          key: noteRender.key,
          line: vexflowGraceNote.getLineNumber(),
          vexflowStaveNote: vexflowGraceNote,
        });
      }
    }

    return curveNotes;
  }

  /**
   * Returns the actual stem direction of the note, including the concrete resulting stem when using auto-stem.
   */
  private getStem(vexflowStaveNote: vexflow.StaveNote): Stem {
    // Calling getStemDirection will throw if there is no stem.
    // https://github.com/vexflow/vexflow/blob/d602715b1c05e21d3498f78b8b5904cb47ad3795/src/stemmablenote.ts#L123
    try {
      const stem = vexflowStaveNote.getStemDirection();
      switch (stem) {
        case 1:
          return 'up';
        case -1:
          return 'down';
        default:
          return 'none';
      }
    } catch (e) {
      return 'none';
    }
  }
}
