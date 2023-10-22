import * as musicxml from '@/musicxml';
import { AccidentalCode } from './accidental';
import { NoteDurationDenominator } from './enums';

/** Converts an `AccidentalType` and an `Alter` to an accidental code. Defaults to 'n'. */
export const toAccidentalCode = (opts: {
  accidentalType: musicxml.AccidentalType | null;
  alter: number | null;
}): AccidentalCode => {
  switch (opts.accidentalType) {
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
  }

  switch (opts.alter) {
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
  }

  return 'n';
};

/** Converts a `NoteType` to a `NoteDurationDenominator`. Defaults to null. */
export const toNoteDurationDenominator = (noteType: musicxml.NoteType | null): NoteDurationDenominator | null => {
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
