import { NamedNode } from './namednode';
import { NoteDurationDenominator, NoteType, Stem } from './types';

export class Note {
  constructor(private node: NamedNode<'note'>) {}

  /** Returns the stem of the note or null when missing or invalid. */
  getStem(): Stem | null {
    const stem = this.node.asElement().getElementsByTagName('stem').item(0)?.textContent;
    if (this.isStem(stem)) {
      return stem;
    }
    return null;
  }

  /** Returns the type of note or 'whole' when missing or invalid. */
  getType(): NoteType {
    const type = this.node.asElement().getElementsByTagName('type').item(0)?.textContent;
    if (this.isNoteType(type)) {
      return type;
    }
    return 'whole';
  }

  /** Translates the note type to the duration denominator of the note. */
  getDurationDenominator(): NoteDurationDenominator {
    switch (this.getType()) {
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
        return '';
    }
  }

  /** Returns how many dots are on the note. */
  getDotCount(): number {
    return this.node.asElement().getElementsByTagName('dot').length;
  }

  private isStem(value: any): value is Stem {
    return ['up', 'down', 'double', 'none'].includes(value);
  }

  private isNoteType(value: any): value is NoteType {
    return [
      '1024th',
      '512th',
      '256th',
      '128th',
      '64th',
      '32nd',
      '16th',
      'eighth',
      'quarter',
      'half',
      'whole',
      'breve',
      'long',
      'maxima',
    ].includes(value);
  }
}
