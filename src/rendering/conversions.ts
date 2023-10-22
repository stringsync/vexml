import * as musicxml from '@/musicxml';
import { AccidentalCode } from './accidental';
import { NoteDurationDenominator } from './enums';
import { Division } from './division';

/** Converts an `AccidentalType` to an `AccidentalCode`. Defaults to null. */
export const fromAccidentalTypeToAccidentalCode = (
  accidentalType: musicxml.AccidentalType | null
): AccidentalCode | null => {
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
  }

  return null;
};

/** Converts an `alter` to an `AccidentalCode`. Defaults to 'n'. */
export const fromAlterToAccidentalCode = (alter: number | null): AccidentalCode => {
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

/** Converts from a `Division` to a `NoteDurationDenominator`. Defaults to '1'. */
export const fromDivisionsToNoteDurationDenominator = (divisions: Division): NoteDurationDenominator => {
  const equal = (numerator: number, denominator: number) => divisions.isEqual(Division.of(numerator, denominator));

  if (equal(4, 1)) {
    return '1';
  }
  if (equal(2, 1)) {
    return '2';
  }
  if (equal(1, 1)) {
    return '4';
  }
  if (equal(1, 2)) {
    return '8';
  }
  if (equal(1, 8)) {
    return '32';
  }
  if (equal(1, 16)) {
    return '64';
  }
  if (equal(1, 32)) {
    return '128';
  }
  if (equal(1, 64)) {
    return '256';
  }
  if (equal(1, 128)) {
    return '512';
  }
  if (equal(1, 256)) {
    return '1024';
  }
  return '1';
};