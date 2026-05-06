import * as vexflow from 'vexflow';
import * as data from '@/data';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { ChordSymbolKind } from '@/data/enums';
import { Document } from './document';
import { ChordSymbolRender, VoiceEntryKey } from './types';

export class ChordSymbol {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(): ChordSymbolRender {
    const chordSymbol = this.getChordSymbol();

    const vexflowModifiers = new Array<vexflow.Modifier>();
    if (chordSymbol) {
      vexflowModifiers.push(this.toVexflowChordSymbol(chordSymbol));
    }

    return {
      type: 'chordsymbol',
      key: this.key,
      rect: Rect.empty(),
      vexflowModifiers,
    };
  }

  private getChordSymbol(): data.ChordSymbol | null {
    const entry = this.document.getVoiceEntry(this.key);
    if (entry.type === 'note' || entry.type === 'chord' || entry.type === 'rest') {
      return entry.chordSymbol;
    }
    return null;
  }

  // For kind=none, prefers kindText if present, otherwise renders 'N.C.'.
  private toVexflowChordSymbol(chordSymbol: data.ChordSymbol): vexflow.ChordSymbol {
    const vexflowChordSymbol = new vexflow.ChordSymbol()
      .setFont(
        this.config.CHORD_SYMBOL_FONT_FAMILY,
        this.config.CHORD_SYMBOL_FONT_SIZE,
        this.config.CHORD_SYMBOL_FONT_WEIGHT
      )
      .setHorizontal(vexflow.ChordSymbol.HorizontalJustify.CENTER);

    // kind=none is text-only (typically "N.C."); skip the structural root/kind/bass rendering.
    if (chordSymbol.kind === 'none') {
      vexflowChordSymbol.addGlyphOrText(chordSymbol.kindText ?? KIND_DISPLAY.none.text);
      return vexflowChordSymbol;
    }

    if (chordSymbol.root.step) {
      addStepAndAccidental(vexflowChordSymbol, chordSymbol.root.step, chordSymbol.root.alter);
    }

    if (chordSymbol.kindText) {
      vexflowChordSymbol.addGlyphOrText(chordSymbol.kindText);
    } else {
      const display = KIND_DISPLAY[chordSymbol.kind];
      if (display.glyph) {
        vexflowChordSymbol.addGlyph(display.glyph);
      }
      if (display.text) {
        vexflowChordSymbol.addGlyphOrText(display.text);
      }
    }

    if (chordSymbol.degrees.length > 0) {
      const parts: string[] = [];
      for (const degree of chordSymbol.degrees) {
        switch (degree.degreeType) {
          case 'add':
            parts.push(`add${degreeAlterToText(degree.alter)}${degree.value}`);
            break;
          case 'alter':
            parts.push(`${degreeAlterToText(degree.alter)}${degree.value}`);
            break;
          case 'subtract':
            parts.push(`omit${degree.value}`);
            break;
        }
      }
      vexflowChordSymbol.addGlyphOrText(`(${parts.join(',')})`);
    }

    if (chordSymbol.bass) {
      vexflowChordSymbol.addGlyph('over');
      addStepAndAccidental(vexflowChordSymbol, chordSymbol.bass.step, chordSymbol.bass.alter);
    }

    return vexflowChordSymbol;
  }
}

// Returns the textual representation of an alter as '#', '##', 'b', 'bb', or '' for natural.
const alterToAccidentalText = (alter: number): string => {
  if (!Number.isFinite(alter) || alter === 0) {
    return '';
  }
  if (alter > 0) {
    return '#'.repeat(Math.min(Math.round(alter), 2));
  }
  return 'b'.repeat(Math.min(Math.round(-alter), 2));
};

const degreeAlterToText = (alter: number): string => {
  if (!Number.isFinite(alter) || alter === 0) {
    return '';
  }
  return alter > 0 ? '#' : 'b';
};

const addStepAndAccidental = (vexflowChordSymbol: vexflow.ChordSymbol, step: string, alter: number): void => {
  vexflowChordSymbol.addText(step);
  const accidental = alterToAccidentalText(alter);
  if (accidental) {
    vexflowChordSymbol.addGlyphOrText(accidental);
  }
};

/**
 * Default display text for each MusicXML <kind> value.
 *
 * Used when the source MusicXML does not provide a `text` attribute on <kind>. Each entry is split into
 * an optional `glyph` (rendered first via addGlyph, e.g. the maj7 triangle, the half-diminished ø) and
 * `text` (rendered via addGlyphOrText so accidentals like '#' and 'b' get glyph substitution).
 */
type KindDisplay = { glyph?: string; text: string };
const KIND_DISPLAY: Record<ChordSymbolKind, KindDisplay> = {
  major: { text: '' },
  minor: { text: 'm' },
  augmented: { text: '+' },
  diminished: { glyph: 'dim', text: '' },
  dominant: { text: '7' },
  'major-seventh': { glyph: 'majorSeventh', text: '7' },
  'minor-seventh': { text: 'm7' },
  'diminished-seventh': { glyph: 'dim', text: '7' },
  'augmented-seventh': { text: '+7' },
  'half-diminished': { glyph: 'halfDiminished', text: '' },
  'major-minor': { text: 'mMaj7' },
  'major-sixth': { text: '6' },
  'minor-sixth': { text: 'm6' },
  'dominant-ninth': { text: '9' },
  'major-ninth': { text: 'maj9' },
  'minor-ninth': { text: 'm9' },
  'dominant-11th': { text: '11' },
  'major-11th': { text: 'maj11' },
  'minor-11th': { text: 'm11' },
  'dominant-13th': { text: '13' },
  'major-13th': { text: 'maj13' },
  'minor-13th': { text: 'm13' },
  'suspended-second': { text: 'sus2' },
  'suspended-fourth': { text: 'sus4' },
  neapolitan: { text: 'N6' },
  italian: { text: 'It+6' },
  french: { text: 'Fr+6' },
  german: { text: 'Gr+6' },
  pedal: { text: 'pedal' },
  power: { text: '5' },
  tristan: { text: 'tristan' },
  other: { text: '' },
  none: { text: 'N.C.' },
};
