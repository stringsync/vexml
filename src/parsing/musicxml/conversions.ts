import * as musicxml from '@/musicxml';
import { NoteDurationDenominator } from './enums';

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