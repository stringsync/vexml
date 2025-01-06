import * as data from '@/data';
import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { StaveKey, VoiceEntryKey, VoiceKey } from './types';
import { Document } from './document';
import { Rect } from '@/spatial';
import { Fraction } from '@/util';

const PLACEHOLDER_RECT = Rect.empty();

type EnsembleNote = {
  type: 'note';
  key: VoiceEntryKey;
  rect: Rect;
  vexflowTickable: vexflow.StaveNote;
  measureBeat: Fraction;
  duration: Fraction;
  stemDirection: data.StemDirection;
};

class EnsembleNoteFactory {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  create(key: VoiceEntryKey): EnsembleNote {
    const note = this.document.getNote(key);

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

    const clef = this.document.getStave(key).signature.clef.sign;

    const vexflowStaveNote = new vexflow.StaveNote({
      keys: [`${note.pitch.step}/${note.pitch.octave}`],
      duration: note.durationType,
      dots: note.dotCount,
      autoStem,
      stemDirection,
      clef,
    });

    for (let index = 0; index < note.dotCount; index++) {
      vexflow.Dot.buildAndAttach([vexflowStaveNote]);
    }

    for (const mod of note.mods) {
      if (mod.type === 'accidental') {
        const vexflowAccidental = new vexflow.Accidental(mod.code);
        if (mod.isCautionary) {
          vexflowAccidental.setAsCautionary();
        }
        vexflowStaveNote.addModifier(vexflowAccidental);
      }

      if (mod.type === 'annotation') {
        const vexflowAnnotation = new vexflow.Annotation(mod.text);
        if (mod.horizontalJustification) {
          vexflowAnnotation.setJustification(mod.horizontalJustification);
        }
        if (mod.verticalJustification) {
          vexflowAnnotation.setVerticalJustification(mod.verticalJustification);
        }
        vexflowStaveNote.addModifier(vexflowAnnotation);
      }
    }

    const duration = Fraction.fromFractionLike(note.duration);
    const measureBeat = Fraction.fromFractionLike(note.measureBeat);

    return {
      type: 'note',
      key,
      rect: PLACEHOLDER_RECT,
      vexflowTickable: vexflowStaveNote,
      duration,
      measureBeat,
      stemDirection: note.stemDirection,
    };
  }
}

type EnsembleRest = {
  type: 'rest';
  key: VoiceEntryKey;
  rect: Rect;
  vexflowTickable: vexflow.StaveNote;
  measureBeat: Fraction;
  duration: Fraction;
};

class EnsembleRestFactory {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  create(key: VoiceEntryKey): EnsembleRest {
    const vexflowKey = this.getVexflowKey(key);
    const rest = this.document.getRest(key);
    const shouldAlignCenter = this.shouldAlignCenter(key);
    const clef = this.document.getStave(key).signature.clef.sign;

    const vexflowStaveNote = new vexflow.StaveNote({
      keys: [vexflowKey],
      duration: `${rest.durationType}r`,
      dots: rest.dotCount,
      clef,
      alignCenter: shouldAlignCenter,
    });

    for (let index = 0; index < rest.dotCount; index++) {
      vexflow.Dot.buildAndAttach([vexflowStaveNote]);
    }

    const duration = Fraction.fromFractionLike(rest.duration);
    const measureBeat = Fraction.fromFractionLike(rest.measureBeat);

    return {
      type: 'rest',
      key,
      rect: PLACEHOLDER_RECT,
      vexflowTickable: vexflowStaveNote,
      duration,
      measureBeat,
    };
  }

  private getVexflowKey(key: VoiceEntryKey): string {
    const rest = this.document.getRest(key);

    const displayPitch = rest.displayPitch;
    if (displayPitch) {
      return `${displayPitch.step}/${displayPitch.octave}`;
    }

    const clef = this.document.getStave(key).signature.clef;
    if (clef.sign === 'bass') {
      return 'B/2';
    }

    if (rest.durationType === '2') {
      return 'B/4';
    }
    if (rest.durationType === '1') {
      return 'D/5';
    }
    return 'B/4';
  }

  private shouldAlignCenter(key: VoiceEntryKey): boolean {
    const voiceEntryCount = this.document.getVoiceEntryCount(key);
    if (voiceEntryCount > 1) {
      return false;
    }

    const rest = this.document.getRest(key);
    if (rest.durationType === '1') {
      return true;
    }
    if (rest.durationType === '2') {
      return true;
    }

    return false;
  }
}

type EnsembleGhostNote = {
  type: 'ghostnote';
  key: VoiceEntryKey;
  rect: Rect;
  vexflowTickable: vexflow.GhostNote;
  measureBeat: Fraction;
  duration: Fraction;
};

class EnsembleGhostNoteFactory {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  create(key: VoiceEntryKey, measureBeat: Fraction, duration: Fraction): EnsembleGhostNote {
    const vexflowGhostNote = new vexflow.GhostNote({
      duration: 'q',
    });

    return {
      type: 'ghostnote',
      key,
      measureBeat,
      duration,
      rect: PLACEHOLDER_RECT,
      vexflowTickable: vexflowGhostNote,
    };
  }
}
