import * as data from '@/data';
import { Signature } from './signature';
import { Key } from './key';

/**
 * @file This file contains **mutable** context objects that are used during parsing.
 *
 * When parsing, parent contexts may need to drill state to a distant descendant. Conversely, a child context may need
 * to communicate state to a distant ancestor. Separate context objects are used to avoid passing state through many
 * layers and to avoid tight coupling between the main parsing classes.
 *
 * NOTE: This code must **not** depend on any other parsing code because it will create an undesireble dependency graph.
 */

export class MeasureContext {
  // partId -> pitch -> octave -> accidental code
  private accidentals: Record<string, Record<string, Record<number, data.AccidentalCode>>> = {};

  constructor(private index: number) {}

  getIndex(): number {
    return this.index;
  }

  getActiveAccidental(partId: string, pitch: string, octave: number): data.AccidentalCode | null {
    return this.accidentals[partId]?.[pitch]?.[octave] ?? null;
  }

  setActiveAccidental(partId: string, pitch: string, octave: number, accidental: data.AccidentalCode): void {
    this.accidentals[partId] ??= {};
    this.accidentals[partId][pitch] ??= {};
    this.accidentals[partId][pitch][octave] = accidental;
  }
}

export class FragmentContext {
  constructor(private measure: MeasureContext, private signature: Signature) {}

  getSignature(): Signature {
    return this.signature;
  }

  getActiveAccidental(partId: string, pitch: string, octave: number): data.AccidentalCode | null {
    return this.measure.getActiveAccidental(partId, pitch, octave);
  }

  setActiveAccidental(partId: string, pitch: string, octave: number, accidental: data.AccidentalCode) {
    this.measure.setActiveAccidental(partId, pitch, octave, accidental);
  }
}

export class PartContext {
  constructor(private fragment: FragmentContext, private id: string) {}

  getId(): string {
    return this.id;
  }

  getKey(staveNumber: number): Key {
    return this.fragment.getSignature().getKey(this.id, staveNumber);
  }

  getActiveAccidental(pitch: string, octave: number): data.AccidentalCode | null {
    return this.fragment.getActiveAccidental(this.id, pitch, octave);
  }

  setActiveAccidental(pitch: string, octave: number, accidental: data.AccidentalCode) {
    this.fragment.setActiveAccidental(this.id, pitch, octave, accidental);
  }
}

export class StaveContext {
  constructor(private part: PartContext, private number: number) {}

  getNumber(): number {
    return this.number;
  }

  getKey(): Key {
    return this.part.getKey(this.number);
  }

  getActiveAccidental(pitch: string, octave: number): data.AccidentalCode | null {
    return this.part.getActiveAccidental(pitch, octave);
  }

  setActiveAccidental(pitch: string, octave: number, accidental: data.AccidentalCode) {
    this.part.setActiveAccidental(pitch, octave, accidental);
  }
}

export class VoiceContext {
  constructor(private stave: StaveContext, private id: string) {}

  getId(): string {
    return this.id;
  }

  getKey(): Key {
    return this.stave.getKey();
  }

  getActiveAccidental(pitch: string, octave: number): data.AccidentalCode | null {
    return this.stave.getActiveAccidental(pitch, octave);
  }

  setActiveAccidental(pitch: string, octave: number, accidental: data.AccidentalCode) {
    this.stave.setActiveAccidental(pitch, octave, accidental);
  }
}

export class NoteContext {
  constructor(private voice: VoiceContext, private pitch: string, private octave: number) {}

  getKeyAccidental(): data.AccidentalCode | null {
    return this.voice.getKey().getAccidentalCode(this.pitch);
  }

  getActiveAccidental(): data.AccidentalCode | null {
    return this.voice.getActiveAccidental(this.pitch, this.octave);
  }

  setActiveAccidental(accidental: data.AccidentalCode) {
    this.voice.setActiveAccidental(this.pitch, this.octave, accidental);
  }
}
