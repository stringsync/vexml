/**
 * @file This file contains **mutable** context objects that are used during parsing.
 *
 * When parsing, parent contexts may need to drill state to a distant descendant. Conversely, a child context may need
 * to communicate state to a distant ancestor. Separate context objects are used to avoid passing state through many
 * layers and to avoid tight coupling between the main parsing classes.
 *
 * NOTE: This code must **not** depend on any other parsing code because it will create an undesireble dependency graph.
 */

import * as data from '@/data';
import { Signature } from './signature';
import { Key } from './key';
import { Time } from './time';
import { IdProvider } from './idprovider';

export class ScoreContext {
  // part ID -> nullable stave number -> multi rest count
  // When the stave number is null, the multi rest count applies to all staves in the part.
  private multiRestCounts = new Map<string, Map<number | null, number>>();

  private curves = new Array<data.Curve>();
  // curve number -> curve id
  // See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/slur/#:~:text=dotted%2C%20or%20wavy.-,number,-number%2Dlevel
  private curveIds = new Map<number | null, string>();

  private wedges = new Array<data.Wedge>();
  // part ID -> stave number -> wedge id
  private wedgeIds = new Map<string, Map<number, string>>();

  constructor(private idProvider: IdProvider) {}

  nextId(): string {
    return this.idProvider.next();
  }

  getMultiRestCount(partId: string, staveNumber: number | null): number {
    return this.multiRestCounts.get(partId)?.get(null) ?? this.multiRestCounts.get(partId)?.get(staveNumber) ?? 0;
  }

  incrementMultiRestCount(partId: string, staveNumber: number | null, count: number): void {
    if (!this.multiRestCounts.has(partId)) {
      this.multiRestCounts.set(partId, new Map());
    }
    this.multiRestCounts.get(partId)!.set(staveNumber, count + this.getMultiRestCount(partId, staveNumber));
  }

  decrementMultiRestCounts(): void {
    for (const partId of this.multiRestCounts.keys()) {
      const staveNumbers = this.multiRestCounts.get(partId)!.keys();
      for (const staveNumber of staveNumbers) {
        const count = this.getMultiRestCount(partId, staveNumber);
        if (count > 0) {
          this.multiRestCounts.get(partId)!.set(staveNumber, count - 1);
        }
      }
    }
  }

  getCurves(): data.Curve[] {
    return this.curves;
  }

  beginCurve(curveNumber: number | null, placement: data.CurvePlacement, opening: data.CurveOpening): string {
    const id = this.nextId();
    this.curves.push({ type: 'curve', id, placement, opening });
    this.curveIds.set(curveNumber, id);
    return id;
  }

  continueCurve(curveNumber: number | null): string | null {
    return this.curveIds.get(curveNumber) ?? null;
  }

  getWedges(): data.Wedge[] {
    return this.wedges;
  }

  beginWedge(partId: string, staveNumber: number, wedgeType: data.WedgeType, placement: data.WedgePlacement): string {
    const id = this.nextId();
    this.wedges.push({ type: 'wedge', wedgeType, id, placement });
    if (!this.wedgeIds.has(partId)) {
      this.wedgeIds.set(partId, new Map());
    }
    this.wedgeIds.get(partId)!.set(staveNumber, id);
    return id;
  }

  continueWedge(partId: string, staveNumber: number): string | null {
    return this.wedgeIds.get(partId)?.get(staveNumber) ?? null;
  }
}

export class SystemContext {
  constructor(private score: ScoreContext) {}

  nextId(): string {
    return this.score.nextId();
  }

  getMultiRestCount(partId: string, staveNumber: number | null): number {
    return this.score.getMultiRestCount(partId, staveNumber);
  }

  incrementMultiRestCount(partId: string, staveNumber: number | null, count: number): void {
    return this.score.incrementMultiRestCount(partId, staveNumber, count);
  }

  decrementMultiRestCounts(): void {
    return this.score.decrementMultiRestCounts();
  }

  beginCurve(curveNumber: number | null, placement: data.CurvePlacement, opening: data.CurveOpening): string {
    return this.score.beginCurve(curveNumber, placement, opening);
  }

  continueCurve(curveNumber: number | null): string | null {
    return this.score.continueCurve(curveNumber);
  }

  beginWedge(partId: string, staveNumber: number, wedgeType: data.WedgeType, placement: data.WedgePlacement): string {
    return this.score.beginWedge(partId, staveNumber, wedgeType, placement);
  }

  continueWedge(partId: string, staveNumber: number): string | null {
    return this.score.continueWedge(partId, staveNumber);
  }
}

export class MeasureContext {
  // part ID -> pitch -> octave -> accidental code
  private accidentals: Record<string, Record<string, Record<number, data.AccidentalCode>>> = {};

  constructor(private system: SystemContext, private index: number) {}

  nextId(): string {
    return this.system.nextId();
  }

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

  getMultiRestCount(partId: string, staveNumber: number): number {
    return this.system.getMultiRestCount(partId, staveNumber);
  }

  beginCurve(curveNumber: number | null, placement: data.CurvePlacement, opening: data.CurveOpening): string {
    return this.system.beginCurve(curveNumber, placement, opening);
  }

  continueCurve(curveNumber: number | null): string | null {
    return this.system.continueCurve(curveNumber);
  }

  beginWedge(partId: string, staveNumber: number, wedgeType: data.WedgeType, placement: data.WedgePlacement): string {
    return this.system.beginWedge(partId, staveNumber, wedgeType, placement);
  }

  continueWedge(partId: string, staveNumber: number): string | null {
    return this.system.continueWedge(partId, staveNumber);
  }
}

export class FragmentContext {
  constructor(private measure: MeasureContext, private signature: Signature) {}

  nextId(): string {
    return this.measure.nextId();
  }

  getSignature(): Signature {
    return this.signature;
  }

  getActiveAccidental(partId: string, pitch: string, octave: number): data.AccidentalCode | null {
    return this.measure.getActiveAccidental(partId, pitch, octave);
  }

  setActiveAccidental(partId: string, pitch: string, octave: number, accidental: data.AccidentalCode) {
    this.measure.setActiveAccidental(partId, pitch, octave, accidental);
  }

  getMultiRestCount(partId: string, staveNumber: number): number {
    return this.measure.getMultiRestCount(partId, staveNumber);
  }

  beginCurve(curveNumber: number | null, placement: data.CurvePlacement, opening: data.CurveOpening): string {
    return this.measure.beginCurve(curveNumber, placement, opening);
  }

  continueCurve(curveNumber: number | null): string | null {
    return this.measure.continueCurve(curveNumber);
  }

  beginWedge(partId: string, staveNumber: number, wedgeType: data.WedgeType, placement: data.WedgePlacement): string {
    return this.measure.beginWedge(partId, staveNumber, wedgeType, placement);
  }

  continueWedge(partId: string, staveNumber: number): string | null {
    return this.measure.continueWedge(partId, staveNumber);
  }
}

export class PartContext {
  constructor(private fragment: FragmentContext, private id: string) {}

  nextId() {
    return this.fragment.nextId();
  }

  getId(): string {
    return this.id;
  }

  getKey(staveNumber: number): Key {
    return this.fragment.getSignature().getKey(this.id, staveNumber);
  }

  getTime(staveNumber: number): Time {
    return this.fragment.getSignature().getTime(this.id, staveNumber);
  }

  getActiveAccidental(pitch: string, octave: number): data.AccidentalCode | null {
    return this.fragment.getActiveAccidental(this.id, pitch, octave);
  }

  setActiveAccidental(pitch: string, octave: number, accidental: data.AccidentalCode) {
    this.fragment.setActiveAccidental(this.id, pitch, octave, accidental);
  }

  getMultiRestCount(staveNumber: number): number {
    return this.fragment.getMultiRestCount(this.id, staveNumber);
  }

  beginCurve(curveNumber: number | null, placement: data.CurvePlacement, opening: data.CurveOpening): string {
    return this.fragment.beginCurve(curveNumber, placement, opening);
  }

  continueCurve(curveNumber: number | null): string | null {
    return this.fragment.continueCurve(curveNumber);
  }

  beginWedge(placement: data.WedgePlacement, wedgeType: data.WedgeType, staveNumber: number): string {
    return this.fragment.beginWedge(this.id, staveNumber, wedgeType, placement);
  }

  continueWedge(staveNumber: number): string | null {
    return this.fragment.continueWedge(this.id, staveNumber);
  }
}

export class StaveContext {
  constructor(private part: PartContext, private number: number) {}

  nextId() {
    return this.part.nextId();
  }

  getNumber(): number {
    return this.number;
  }

  getKey(): Key {
    return this.part.getKey(this.number);
  }

  getTime(): Time {
    return this.part.getTime(this.number);
  }

  getActiveAccidental(pitch: string, octave: number): data.AccidentalCode | null {
    return this.part.getActiveAccidental(pitch, octave);
  }

  setActiveAccidental(pitch: string, octave: number, accidental: data.AccidentalCode) {
    this.part.setActiveAccidental(pitch, octave, accidental);
  }

  getMultiRestCount(): number {
    return this.part.getMultiRestCount(this.number);
  }

  beginCurve(curveNumber: number | null, placement: data.CurvePlacement, opening: data.CurveOpening): string {
    return this.part.beginCurve(curveNumber, placement, opening);
  }

  continueCurve(curveNumber: number | null): string | null {
    return this.part.continueCurve(curveNumber);
  }

  beginWedge(placement: data.WedgePlacement, wedgeType: data.WedgeType): string {
    return this.part.beginWedge(placement, wedgeType, this.number);
  }

  continueWedge(): string | null {
    return this.part.continueWedge(this.number);
  }
}

export class VoiceContext {
  private beams = new Array<data.Beam>();

  // tuplet number -> tuplet
  private openTuplets = new Map<number, data.Tuplet>();
  private closedTuplets = new Array<data.Tuplet>();

  constructor(private stave: StaveContext, private id: string) {}

  nextId() {
    return this.stave.nextId();
  }

  getId(): string {
    return this.id;
  }

  getKey(): Key {
    return this.stave.getKey();
  }

  getTime(): Time {
    return this.stave.getTime();
  }

  getActiveAccidental(pitch: string, octave: number): data.AccidentalCode | null {
    return this.stave.getActiveAccidental(pitch, octave);
  }

  setActiveAccidental(pitch: string, octave: number, accidental: data.AccidentalCode) {
    this.stave.setActiveAccidental(pitch, octave, accidental);
  }

  getMultiRestCount(): number {
    return this.stave.getMultiRestCount();
  }

  beginCurve(curveNumber: number | null, placement: data.CurvePlacement, opening: data.CurveOpening): string {
    return this.stave.beginCurve(curveNumber, placement, opening);
  }

  continueCurve(curveNumber: number | null): string | null {
    return this.stave.continueCurve(curveNumber);
  }

  getBeams(): data.Beam[] {
    return this.beams;
  }

  beginBeam(): string {
    const id = this.nextId();
    this.beams.push({ type: 'beam', id });
    return id;
  }

  continueBeam(): string | null {
    return this.beams.at(-1)?.id ?? null;
  }

  getTuplets(): data.Tuplet[] {
    return this.closedTuplets;
  }

  beginTuplet(number: number, showNumber: boolean, placement: data.TupletPlacement): string {
    const id = this.nextId();
    this.openTuplets.set(number, { type: 'tuplet', id, showNumber, placement });
    return id;
  }

  continueOpenTuplets(): string[] {
    return [...this.openTuplets.values()].map((tuplet) => tuplet.id);
  }

  closeTuplet(number: number): string | null {
    if (!this.openTuplets.has(number)) {
      return null;
    }

    const tuplet = this.openTuplets.get(number)!;

    this.closedTuplets.push(tuplet);
    this.openTuplets.delete(number);

    return tuplet.id;
  }

  beginWedge(placement: data.WedgePlacement, wedgeType: data.WedgeType): string {
    return this.stave.beginWedge(placement, wedgeType);
  }

  continueWedge(): string | null {
    return this.stave.continueWedge();
  }
}

export class VoiceEntryContext {
  private constructor(private voice: VoiceContext, private pitch: string, private octave: number) {}

  static note(voice: VoiceContext, pitch: string, octave: number): VoiceEntryContext {
    return new VoiceEntryContext(voice, pitch, octave);
  }

  static rest(voice: VoiceContext): VoiceEntryContext {
    return new VoiceEntryContext(voice, '', 0);
  }

  nextId() {
    return this.voice.nextId();
  }

  getKeyAccidental(): data.AccidentalCode | null {
    return this.voice.getKey().getAccidentalCode(this.pitch);
  }

  getActiveAccidental(): data.AccidentalCode | null {
    return this.voice.getActiveAccidental(this.pitch, this.octave);
  }

  setActiveAccidental(accidental: data.AccidentalCode) {
    this.voice.setActiveAccidental(this.pitch, this.octave, accidental);
  }

  beginCurve(curveNumber: number | null, placement: data.CurvePlacement, opening: data.CurveOpening): string {
    return this.voice.beginCurve(curveNumber, placement, opening);
  }

  continueCurve(curveNumber: number | null): string | null {
    return this.voice.continueCurve(curveNumber);
  }

  beginBeam(): string {
    return this.voice.beginBeam();
  }

  continueBeam(): string | null {
    return this.voice.continueBeam();
  }

  beginTuplet(number: number, showNumber: boolean, placement: data.TupletPlacement): string {
    return this.voice.beginTuplet(number, showNumber, placement);
  }

  continueOpenTuplets(): string[] {
    return this.voice.continueOpenTuplets();
  }

  closeTuplet(number: number): string | null {
    return this.voice.closeTuplet(number);
  }

  beginWedge(placement: data.WedgePlacement, wedgeType: data.WedgeType): string {
    return this.voice.beginWedge(placement, wedgeType);
  }

  continueWedge(): string | null {
    return this.voice.continueWedge();
  }
}
