import * as musicxml from '@/musicxml';
import { NoteDurationDenominator, Notehead } from './enums';

/** Converts a `NoteType` to a `NoteDurationDenominator`. Defaults to null. */
export const fromNoteTypeToNoteDurationDenominator = (
  noteType: musicxml.NoteType | null
): NoteDurationDenominator | null => {
  switch (noteType) {
    case '1024th':
      return '1024';
    case '512th':
      return '512';
    case '256th':
      return '256';
    case '128th':
      return '128';
    case '64th':
      return '64';
    case '32nd':
      return '32';
    case '16th':
      return '16';
    case 'eighth':
      return '8';
    case 'quarter':
      return '4';
    case 'half':
      return '2';
    case 'whole':
      return '1';
    case 'breve':
      return '1/2';
    case 'long':
      // VexFlow bug: should be '1/4' but it is not supported
      // return '1/4';
      return '1/2';
    default:
      return null;
  }
};

/** Converts `Notehead` to a `NoteheadSuffix`. Defaults to ''. */
export const fromNoteheadToNoteheadSuffix = (notehead: musicxml.Notehead | null): Notehead | null => {
  switch (notehead) {
    case 'circle dot':
    case 'cluster':
    case 'left triangle':
    case 'cross':
    case 'arrow down':
    case 'arrow up':
      return '';
    case 'slashed':
      return 'SF';
    case 'inverted triangle':
      return 'TI';
    case 'square':
      return 'S2';
    case 'circle-x':
      return 'CX';
    case 'back slashed':
      return 'SB';
    case 'circled':
      return 'CI';
    case 'diamond':
      return 'D2';
    case 'do':
      return 'DO';
    case 'fa':
      return 'FA';
    case 'fa up':
      return 'FAUP';
    case 'mi':
      return 'MI';
    case 'normal':
      return 'N';
    case 'slash':
      return 'S';
    case 'so':
      return 'SO';
    case 'ti':
      return 'TI';
    case 'triangle':
      return 'TU';
    case 'x':
      return 'X';
    default:
      return null;
  }
};
