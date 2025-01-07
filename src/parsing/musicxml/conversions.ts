import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { Fraction } from '@/util';
import { Notehead, StemDirection } from './enums';

/** Converts a `NoteType` to a `DurationType`. Defaults to null. */
export const fromNoteTypeToDurationType = (noteType: musicxml.NoteType | null): data.DurationType | null => {
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

export const fromFractionToDurationType = (fraction: Fraction): [durationType: data.DurationType, dotCount: number] => {
  function equivalent(numerator: number, denominator: number): boolean {
    return fraction.isEquivalent(new Fraction(numerator, denominator));
  }

  // no dots
  if (equivalent(1, 256)) {
    return ['1024', 0];
  }
  if (equivalent(1, 128)) {
    return ['512', 0];
  }
  if (equivalent(1, 64)) {
    return ['256', 0];
  }
  if (equivalent(1, 32)) {
    return ['128', 0];
  }
  if (equivalent(1, 16)) {
    return ['64', 0];
  }
  if (equivalent(1, 8)) {
    return ['32', 0];
  }
  if (equivalent(1, 4)) {
    return ['16', 0];
  }
  if (equivalent(1, 2)) {
    return ['8', 0];
  }
  if (equivalent(1, 1)) {
    return ['4', 0];
  }
  if (equivalent(2, 1)) {
    return ['2', 0];
  }
  if (equivalent(4, 1)) {
    return ['1', 0];
  }
  if (equivalent(8, 1)) {
    return ['1/2', 0];
  }

  // 1 dot
  if (equivalent(3, 128)) {
    return ['256', 1];
  }
  if (equivalent(3, 64)) {
    return ['128', 1];
  }
  if (equivalent(3, 32)) {
    return ['64', 1];
  }
  if (equivalent(3, 16)) {
    return ['32', 1];
  }
  if (equivalent(3, 8)) {
    return ['16', 1];
  }
  if (equivalent(3, 4)) {
    return ['8', 1];
  }
  if (equivalent(3, 2)) {
    return ['4', 1];
  }
  if (equivalent(3, 1)) {
    return ['2', 1];
  }
  if (equivalent(6, 1)) {
    return ['1', 1];
  }
  if (equivalent(12, 1)) {
    return ['1/2', 1];
  }

  return ['1', 0];
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

/** Converts MusicXML clef properties to a `ClefSign`. Defaults to 'treble'. */
export const fromClefPropertiesToClefSign = (sign: musicxml.ClefSign | null, line: number | null): data.ClefSign => {
  if (sign === 'G') {
    // with G line defaults to 2
    // see https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/line/
    if (line === 1) return 'french';
    return 'treble';
  }

  if (sign === 'F') {
    if (line === 5) return 'subbass';
    if (line === 3) return 'baritone-f';
    return 'bass';
  }

  if (sign === 'C') {
    if (line === 5) return 'baritone-c';
    if (line === 4) return 'tenor';
    if (line === 2) return 'mezzo-soprano';
    if (line === 1) return 'soprano';
    return 'alto';
  }

  if (sign === 'percussion') {
    return 'percussion';
  }

  if (sign === 'TAB') {
    return 'tab';
  }

  return 'treble';
};

/** Converts the number of fifths to a major key. */
export const fromFifthsToMajorKey = (fifths: number) => {
  switch (fifths) {
    case -7:
      return 'Cb';
    case -6:
      return 'Gb';
    case -5:
      return 'Db';
    case -4:
      return 'Ab';
    case -3:
      return 'Eb';
    case -2:
      return 'Bb';
    case -1:
      return 'F';
    case 0:
      return 'C';
    case 1:
      return 'G';
    case 2:
      return 'D';
    case 3:
      return 'A';
    case 4:
      return 'E';
    case 5:
      return 'B';
    case 6:
      return 'F#';
    case 7:
      return 'C#';
    default:
      throw new Error(`cannot handle fifths: ${fifths}`);
  }
};

/** Converts the number of fifths to a minor key. */
export const fromFifthsToMinorKey = (fifths: number) => {
  switch (fifths) {
    case -7:
      return 'Abm';
    case -6:
      return 'Ebm';
    case -5:
      return 'Bbm';
    case -4:
      return 'Fm';
    case -3:
      return 'Cm';
    case -2:
      return 'Gm';
    case -1:
      return 'Dm';
    case 0:
      return 'Am';
    case 1:
      return 'Em';
    case 2:
      return 'Bm';
    case 3:
      return 'F#m';
    case 4:
      return 'C#m';
    case 5:
      return 'G#m';
    case 6:
      return 'D#m';
    case 7:
      return 'A#m';
    default:
      throw new Error(`cannot handle fifths: ${fifths}`);
  }
};
