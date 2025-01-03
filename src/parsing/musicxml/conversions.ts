import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { NoteDurationDenominator, Notehead, StemDirection } from './enums';

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

/** Converts from a `Stem` to a `StemDirection`. Defaults to 'auto'. */
export const fromStemToStemDirection = (stem: musicxml.Stem | null): StemDirection => {
  switch (stem) {
    case 'up':
      return 'up';
    case 'down':
      return 'down';
    case 'none':
      return 'none';
    default:
      return 'auto';
  }
};

/** Converts a MusicXML `Notehead` to a `Notehead`. Defaults to ''. */
export const fromNoteheadToNotehead = (notehead: musicxml.Notehead | null): Notehead => {
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
      return '';
  }
};

/** Converts an `AccidentalType` to an `AccidentalCode`. Defaults to null. */
export const fromAccidentalTypeToAccidentalCode = (
  accidentalType: musicxml.AccidentalType | null
): data.AccidentalCode | null => {
  switch (accidentalType) {
    case 'sharp':
      return '#';
    case 'double-sharp':
      return '##';
    case 'flat':
      return 'b';
    case 'flat-flat':
      return 'bb';
    case 'natural':
      return 'n';
    case 'quarter-sharp':
      return '+';
    case 'quarter-flat':
      return 'd';
    case 'three-quarters-sharp':
      return '++';
    case 'three-quarters-flat':
      return 'db';
  }

  return null;
};

/** Converts an `alter` to an `AccidentalCode`. Defaults to 'n'. */
export const fromAlterToAccidentalCode = (alter: number | null): data.AccidentalCode => {
  switch (alter) {
    case 1:
      return '#';
    case 2:
      return '##';
    case -1:
      return 'b';
    case -2:
      return 'bb';
    case 0:
      return 'n';
    case -0.5:
      return 'd';
    case 0.5:
      return '+';
    case -1.5:
      return 'db';
    case 1.5:
      return '++';
    default:
      return 'n';
  }
};
