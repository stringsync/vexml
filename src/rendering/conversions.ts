import * as musicxml from '@/musicxml';
import { AccidentalCode } from './accidental';

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
