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
  // curve number -> curve ID
  // See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/slur/#:~:text=dotted%2C%20or%20wavy.-,number,-number%2Dlevel
  private curveIds = new Map<number | null, string>();

  private wedges = new Array<data.Wedge>();
  // part ID -> stave number -> wedge status
  private wedgeStatuses = new Map<string, Map<number, { id: string; count: number; delete: boolean }>>();

  private pedals = new Array<data.Pedal>();
  // part ID -> pedal status
  private pedalStatuses = new Map<string, { id: string; next: data.PedalMarkType; count: number; delete: boolean }>();

  private octaveShifts = new Array<data.OctaveShift>();
  // part ID -> stave number -> octave shift status
  private octaveShiftStatuses = new Map<string, Map<number, { id: string; count: number; delete: boolean }>>();

  private vibratos = new Array<data.Vibrato>();
  // vibrato number -> vibrato ID
  private vibratoStatuses = new Map<number, string>();

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

    if (!this.wedgeStatuses.has(partId)) {
      this.wedgeStatuses.set(partId, new Map());
    }

    this.wedgeStatuses.get(partId)!.set(staveNumber, { id, count: 0, delete: false });

    return id;
  }

  continueOpenWedge(partId: string, staveNumber: number): string | null {
    const status = this.wedgeStatuses.get(partId)?.get(staveNumber);
    if (!status) {
      return null;
    }

    if (status.delete) {
      this.wedgeStatuses.get(partId)?.delete(staveNumber);
    }

    status.count++;

    return status.id;
  }

  closeWedge(partId: string, staveNumber: number): void {
    const status = this.wedgeStatuses.get(partId)?.get(staveNumber);
    if (!status) {
      return;
    }

    if (status.count > 1) {
      this.wedgeStatuses.get(partId)?.delete(staveNumber);
    } else {
      // We don't meet the criteria to be fully specified, so we'll mark for delete later.
      status.delete = true;
    }
  }

  getPedals(): data.Pedal[] {
    return this.pedals;
  }

  beginPedal(partId: string, pedalType: data.PedalType): string {
    const id = this.nextId();
    this.pedals.push({ type: 'pedal', id, pedalType });
    this.pedalStatuses.set(partId, { id, next: 'default', count: 0, delete: false });
    return id;
  }

  continueOpenPedal(partId: string): data.PedalMark | null {
    const status = this.pedalStatuses.get(partId);
    if (!status) {
      return null;
    }

    const pedalMarkType = status.next;
    status.next = 'default'; // consume the next pedal mark type

    if (status.delete && status.count > 1) {
      this.pedalStatuses.delete(partId);
    }

    if (pedalMarkType === 'change') {
      // We don't want to end the pedal mark on a change, so we reset the count.
      status.count = 1;
    } else {
      status.count++;
    }

    return { type: 'pedalmark', pedalMarkType, pedalId: status.id };
  }

  primeNextPedalMark(partId: string, pedalMarkType: data.PedalMarkType): void {
    const status = this.pedalStatuses.get(partId);
    if (status) {
      status.next = pedalMarkType;
    }
  }

  closePedal(partId: string): void {
    const status = this.pedalStatuses.get(partId);
    if (!status) {
      return;
    }

    if (status.count > 1) {
      this.pedalStatuses.delete(partId);
    } else {
      // We don't meet the criteria to be fully specified, so we'll mark for delete later.
      status.delete = true;
    }
  }

  getOctaveShifts(): data.OctaveShift[] {
    return this.octaveShifts;
  }

  beginOctaveShift(partId: string, staveNumber: number, size: number): string {
    const id = this.nextId();

    this.octaveShifts.push({ type: 'octaveshift', id, size });

    if (!this.octaveShiftStatuses.has(partId)) {
      this.octaveShiftStatuses.set(partId, new Map());
    }
    this.octaveShiftStatuses.get(partId)!.set(staveNumber, { id, count: 0, delete: false });

    return id;
  }

  continueOpenOctaveShift(partId: string, staveNumber: number): string | null {
    const status = this.octaveShiftStatuses.get(partId)?.get(staveNumber);
    if (!status) {
      return null;
    }

    if (status.delete && status.count > 1) {
      this.octaveShiftStatuses.get(partId)?.delete(staveNumber);
    }

    status.count++;

    return status.id;
  }

  closeOctaveShift(partId: string, staveNumber: number): void {
    const status = this.octaveShiftStatuses.get(partId)?.get(staveNumber);
    if (!status) {
      return;
    }

    if (status.count > 1) {
      this.octaveShiftStatuses.get(partId)?.delete(staveNumber);
    } else {
      // We don't meet the criteria to be fully specified, so we'll mark for delete later.
      status.delete = true;
    }
  }

  getVibratos(): data.Vibrato[] {
    return this.vibratos;
  }

  beginVibrato(vibratoNumber: number): string {
    const id = this.nextId();
    this.vibratos.push({ type: 'vibrato', id });
    this.vibratoStatuses.set(vibratoNumber, id);
    return id;
  }

  continueVibrato(vibratoNumber: number): string | null {
    return this.vibratoStatuses.get(vibratoNumber) ?? null;
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

  continueOpenWedge(partId: string, staveNumber: number): string | null {
    return this.score.continueOpenWedge(partId, staveNumber);
  }

  closeWedge(partId: string, staveNumber: number): void {
    this.score.closeWedge(partId, staveNumber);
  }

  beginPedal(partId: string, pedalType: data.PedalType): string {
    return this.score.beginPedal(partId, pedalType);
  }

  continueOpenPedal(partId: string): data.PedalMark | null {
    return this.score.continueOpenPedal(partId);
  }

  primeNextPedalMark(partId: string, pedalMarkType: data.PedalMarkType): void {
    this.score.primeNextPedalMark(partId, pedalMarkType);
  }

  closePedal(partId: string): void {
    this.score.closePedal(partId);
  }

  beginOctaveShift(partId: string, staveNumber: number, size: number): string {
    return this.score.beginOctaveShift(partId, staveNumber, size);
  }

  continueOpenOctaveShift(partId: string, staveNumber: number): string | null {
    return this.score.continueOpenOctaveShift(partId, staveNumber);
  }

  closeOctaveShift(partId: string, staveNumber: number): void {
    this.score.closeOctaveShift(partId, staveNumber);
  }

  beginVibrato(vibratoNumber: number): string {
    return this.score.beginVibrato(vibratoNumber);
  }

  continueVibrato(vibratoNumber: number): string | null {
    return this.score.continueVibrato(vibratoNumber);
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

  continueOpenWedge(partId: string, staveNumber: number): string | null {
    return this.system.continueOpenWedge(partId, staveNumber);
  }

  closeWedge(partId: string, staveNumber: number): void {
    this.system.closeWedge(partId, staveNumber);
  }

  beginPedal(partId: string, pedalType: data.PedalType): string {
    return this.system.beginPedal(partId, pedalType);
  }

  continueOpenPedal(partId: string): data.PedalMark | null {
    return this.system.continueOpenPedal(partId);
  }

  primeNextPedalMark(partId: string, pedalMarkType: data.PedalMarkType): void {
    this.system.primeNextPedalMark(partId, pedalMarkType);
  }

  closePedal(partId: string): void {
    this.system.closePedal(partId);
  }

  beginOctaveShift(partId: string, staveNumber: number, size: number): string {
    return this.system.beginOctaveShift(partId, staveNumber, size);
  }

  continueOpenOctaveShift(partId: string, staveNumber: number): string | null {
    return this.system.continueOpenOctaveShift(partId, staveNumber);
  }

  closeOctaveShift(partId: string, staveNumber: number): void {
    this.system.closeOctaveShift(partId, staveNumber);
  }

  beginVibrato(vibratoNumber: number): string {
    return this.system.beginVibrato(vibratoNumber);
  }

  continueVibrato(vibratoNumber: number): string | null {
    return this.system.continueVibrato(vibratoNumber);
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

  continueOpenWedge(partId: string, staveNumber: number): string | null {
    return this.measure.continueOpenWedge(partId, staveNumber);
  }

  closeWedge(partId: string, staveNumber: number): void {
    this.measure.closeWedge(partId, staveNumber);
  }

  beginPedal(partId: string, pedalType: data.PedalType): string {
    return this.measure.beginPedal(partId, pedalType);
  }

  continueOpenPedal(partId: string): data.PedalMark | null {
    return this.measure.continueOpenPedal(partId);
  }

  primeNextPedalMark(partId: string, pedalMarkType: data.PedalMarkType): void {
    this.measure.primeNextPedalMark(partId, pedalMarkType);
  }

  closePedal(partId: string): void {
    this.measure.closePedal(partId);
  }

  beginOctaveShift(partId: string, staveNumber: number, size: number): string {
    return this.measure.beginOctaveShift(partId, staveNumber, size);
  }

  continueOpenOctaveShift(partId: string, staveNumber: number): string | null {
    return this.measure.continueOpenOctaveShift(partId, staveNumber);
  }

  closeOctaveShift(partId: string, staveNumber: number): void {
    this.measure.closeOctaveShift(partId, staveNumber);
  }

  beginVibrato(vibratoNumber: number): string {
    return this.measure.beginVibrato(vibratoNumber);
  }

  continueVibrato(vibratoNumber: number): string | null {
    return this.measure.continueVibrato(vibratoNumber);
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

  continueOpenWedge(staveNumber: number): string | null {
    return this.fragment.continueOpenWedge(this.id, staveNumber);
  }

  closeWedge(staveNumber: number): void {
    this.fragment.closeWedge(this.id, staveNumber);
  }

  beginPedal(pedalType: data.PedalType): string {
    return this.fragment.beginPedal(this.id, pedalType);
  }

  continueOpenPedal(): data.PedalMark | null {
    return this.fragment.continueOpenPedal(this.id);
  }

  primeNextPedalMark(pedalMarkType: data.PedalMarkType): void {
    this.fragment.primeNextPedalMark(this.id, pedalMarkType);
  }

  closePedal(): void {
    this.fragment.closePedal(this.id);
  }

  beginOctaveShift(staveNumber: number, size: number): string {
    return this.fragment.beginOctaveShift(this.id, staveNumber, size);
  }

  continueOpenOctaveShift(staveNumber: number): string | null {
    return this.fragment.continueOpenOctaveShift(this.id, staveNumber);
  }

  closeOctaveShift(staveNumber: number): void {
    this.fragment.closeOctaveShift(this.id, staveNumber);
  }

  beginVibrato(vibratoNumber: number): string {
    return this.fragment.beginVibrato(vibratoNumber);
  }

  continueVibrato(vibratoNumber: number): string | null {
    return this.fragment.continueVibrato(vibratoNumber);
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

  continueOpenWedge(): string | null {
    return this.part.continueOpenWedge(this.number);
  }

  closeWedge(): void {
    this.part.closeWedge(this.number);
  }

  beginPedal(pedalType: data.PedalType): string {
    return this.part.beginPedal(pedalType);
  }

  continueOpenPedal(): data.PedalMark | null {
    return this.part.continueOpenPedal();
  }

  primeNextPedalMark(pedalMarkType: data.PedalMarkType): void {
    this.part.primeNextPedalMark(pedalMarkType);
  }

  closePedal(): void {
    this.part.closePedal();
  }

  beginOctaveShift(size: number): string {
    return this.part.beginOctaveShift(this.number, size);
  }

  continueOpenOctaveShift(): string | null {
    return this.part.continueOpenOctaveShift(this.number);
  }

  closeOctaveShift(): void {
    this.part.closeOctaveShift(this.number);
  }

  beginVibrato(vibratoNumber: number): string {
    return this.part.beginVibrato(vibratoNumber);
  }

  continueVibrato(vibratoNumber: number): string | null {
    return this.part.continueVibrato(vibratoNumber);
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

  continueOpenWedge(): string | null {
    return this.stave.continueOpenWedge();
  }

  closeWedge(): void {
    this.stave.closeWedge();
  }

  beginPedal(pedalType: data.PedalType): string {
    return this.stave.beginPedal(pedalType);
  }

  continueOpenPedal(): data.PedalMark | null {
    return this.stave.continueOpenPedal();
  }

  primeNextPedalMark(pedalMarkType: data.PedalMarkType): void {
    this.stave.primeNextPedalMark(pedalMarkType);
  }

  closePedal(): void {
    this.stave.closePedal();
  }

  beginOctaveShift(size: number): string {
    return this.stave.beginOctaveShift(size);
  }

  continueOpenOctaveShift(): string | null {
    return this.stave.continueOpenOctaveShift();
  }

  closeOctaveShift(): void {
    this.stave.closeOctaveShift();
  }

  beginVibrato(vibratoNumber: number): string {
    return this.stave.beginVibrato(vibratoNumber);
  }

  continueVibrato(vibratoNumber: number): string | null {
    return this.stave.continueVibrato(vibratoNumber);
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

  continueOpenWedge(): string | null {
    return this.voice.continueOpenWedge();
  }

  continueOpenPedal(): data.PedalMark | null {
    return this.voice.continueOpenPedal();
  }

  continueOpenOctaveShift(): string | null {
    return this.voice.continueOpenOctaveShift();
  }

  beginVibrato(vibratoNumber: number): string {
    return this.voice.beginVibrato(vibratoNumber);
  }

  continueVibrato(vibratoNumber: number): string | null {
    return this.voice.continueVibrato(vibratoNumber);
  }
}
