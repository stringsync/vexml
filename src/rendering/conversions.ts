import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { AccidentalCode } from './accidental';
import { ClefType, NoteDurationDenominator, NoteheadSuffix, StemDirection } from './enums';
import { Division } from './division';
import { BeamFragmentType } from './beam';

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

/** Converts from a `BarStyle` to a `BarlineType`. Defaults to `vexflow.BarlineType.NONE`. */
export const fromBarStyleToBarlineType = (barStyle: musicxml.BarStyle): vexflow.BarlineType => {
  switch (barStyle) {
    case 'regular':
    case 'short':
    case 'dashed':
    case 'dotted':
    case 'heavy':
      return vexflow.BarlineType.SINGLE;
    case 'heavy-light':
    case 'heavy-heavy':
    case 'light-light':
    case 'tick':
      return vexflow.BarlineType.DOUBLE;
    case 'light-heavy':
      return vexflow.BarlineType.END;
    case 'none':
      return vexflow.BarlineType.NONE;
    default:
      return vexflow.BarlineType.NONE;
  }
};

/** Converts a `BarlineType` to a _beginning_ `StaveConnectorType`. Defaults to `vexflow.BarlineType.SINGLE`. */
export const fromBarlineTypeToBeginningStaveConnectorType = (
  barlineType: vexflow.BarlineType
): vexflow.StaveConnectorType => {
  switch (barlineType) {
    case vexflow.BarlineType.SINGLE:
      return 'singleLeft';
    case vexflow.BarlineType.DOUBLE:
      return 'boldDoubleLeft';
    default:
      return vexflow.BarlineType.SINGLE;
  }
};

/** Converts a `BarlineType` to an _ending_ `StaveConnectorType`. Defaults to `vexflow.BarlineType.SINGLE`. */
export const fromBarlineTypeToEndingStaveConnectorType = (
  barlineType: vexflow.BarlineType
): vexflow.StaveConnectorType => {
  switch (barlineType) {
    case vexflow.BarlineType.SINGLE:
      return 'singleRight';
    case vexflow.BarlineType.END:
      return 'boldDoubleRight';
    default:
      return vexflow.BarlineType.SINGLE;
  }
};

/** Converts `Notehead` to a `NoteheadSuffix`. Defaults to ''. */
export const fromNoteheadToNoteheadSuffix = (notehead: musicxml.Notehead | null): NoteheadSuffix | null => {
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

/** Converts `AboveBelow` to a `TupletLocation`. */
export const fromAboveBelowToTupletLocation = (aboveBelow: musicxml.AboveBelow): vexflow.TupletLocation => {
  switch (aboveBelow) {
    case 'above':
      return vexflow.Tuplet.LOCATION_TOP;
    case 'below':
      return vexflow.Tuplet.LOCATION_BOTTOM;
  }
};

/** Converts `AboveBelow` to a vexflow slur direction. */
export const fromAboveBelowToVexflowSlurDirection = (aboveBelow: musicxml.AboveBelow): number => {
  // This looks upside down, but it's not.
  switch (aboveBelow) {
    case 'above':
      return -1;
    case 'below':
      return 1;
  }
};

/** Converts a vexflow Stem to a `musicxml.Stem`. Defaults to 'none'. */
export const fromVexflowStemDirectionToMusicXMLStem = (stem: number): musicxml.Stem => {
  switch (stem) {
    case 1:
      return 'up';
    case -1:
      return 'down';
    default:
      return 'none';
  }
};

/**
 * Converts a `musicxml.WedgeType` to a `vexflow.StaveHairpin.type` (number).
 *
 * Defaults to `vexflow.StaveHairpin.type.CRESC`
 */
export const fromWedgeTypeToStaveHairpinType = (wedgeType: musicxml.WedgeType): number => {
  switch (wedgeType) {
    case 'diminuendo':
      return vexflow.StaveHairpin.type.DECRESC;
    default:
      return vexflow.StaveHairpin.type.CRESC;
  }
};

/** Converts a `musicxml.AboveBelow` to a `vexflow.ModifierPosition`. */
export const fromAboveBelowToModifierPosition = (aboveBelow: musicxml.AboveBelow): vexflow.ModifierPosition => {
  switch (aboveBelow) {
    case 'above':
      return vexflow.ModifierPosition.ABOVE;
    case 'below':
      return vexflow.ModifierPosition.BELOW;
  }
};

/** Converts a `musicxml.OctaveShift` to the number of octaves it computes to. */
export const fromOctaveShiftToOctaveCount = (octaveShift: musicxml.OctaveShift | null): number => {
  if (octaveShift === null) {
    return 0;
  }

  if (octaveShift.getType() === 'stop') {
    return 0;
  }

  // Assuming the size attribute increments in steps of 7 for each octave after the first
  // and that an octave shift size of 8 corresponds to a single octave.
  const size = octaveShift.getSize();
  if (size < 8) {
    // If size is less than 8, it's not a valid octave-shift value for this context,
    // or it could represent a shift of less than an octave.
    return 0;
  }

  const multiplier = octaveShift.getType() === 'up' ? 1 : -1;

  // The first octave shift starts at size 8 (for 1 octave),
  // then each subsequent octave adds 7 to the size (15 for 2 octaves, 22 for 3, etc.)
  return Math.floor((size - 1) / 7) * multiplier;
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

/** Converts clef properties to a `ClefType`. Defaults to 'treble'. */
export const fromClefPropertiesToClefType = (sign: musicxml.ClefSign | null, line: number | null): ClefType => {
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

/** Converts a nullable `musicxml.BeamValue` to a `BeamFragmentType`. Defaults to null. */
export const fromBeamValueToBeamFragmentType = (beamValue: musicxml.BeamValue | null): BeamFragmentType | null => {
  switch (beamValue) {
    case 'begin':
      return 'start';
    case 'continue':
    case 'backward hook':
    case 'forward hook':
      return 'continue';
    case 'end':
      return 'stop';
    default:
      return null;
  }
};
