import * as musicxml from '@/musicxml';
import { Metronome } from './metronome';
import { StaveCount } from './stavecount';
import { StaveLineCount } from './stavelinecount';
import { Clef } from './clef';
import { Key } from './key';
import { Time } from './time';
import { SignatureChange } from './types';
import { FragmentSignature } from './fragmentsignature';
import { PartSignature } from './partsignature';
import { StaveSignature } from './stavesignature';

/** Signature tracks how subsignatures evolve as the piece progresses. */
export class Signature {
  constructor(
    private metronome: Metronome | null,
    private staveCounts: StaveCount[],
    private staveLineCounts: StaveLineCount[],
    private clefs: Clef[],
    private keys: Key[],
    private times: Time[],
    private changes: SignatureChange[]
  ) {}

  static default(): Signature {
    return new Signature(null, [], [], [], [], [], []);
  }

  static builder(): SignatureBuilder {
    return new SignatureBuilder();
  }

  asFragmentSignature(): FragmentSignature {
    return new FragmentSignature(this.getMetronome());
  }

  asPartSignature(partId: string): PartSignature {
    return new PartSignature(this.getStaveCount(partId));
  }

  asStaveSignature(partId: string, staveNumber: number): StaveSignature {
    return new StaveSignature(
      this.getStaveLineCount(partId, staveNumber),
      this.getClef(partId, staveNumber),
      this.getKey(partId, staveNumber),
      this.getTime(partId, staveNumber)
    );
  }

  getMetronome(): Metronome {
    return this.metronome ?? Metronome.default();
  }

  getStaveCount(partId: string): StaveCount {
    return this.staveCounts.find((s) => s.getPartId() === partId) ?? StaveCount.default(partId);
  }

  getStaveCounts(): StaveCount[] {
    return this.staveCounts;
  }

  getStaveLineCount(partId: string, staveNumber: number): StaveLineCount {
    return (
      this.staveLineCounts.find((s) => s.getPartId() === partId && s.getStaveNumber() === staveNumber) ??
      StaveLineCount.default(partId, staveNumber)
    );
  }

  getStaveLineCounts(): StaveLineCount[] {
    return this.staveLineCounts;
  }

  getClef(partId: string, staveNumber: number): Clef {
    return (
      this.clefs.find((c) => c.getPartId() === partId && c.getStaveNumber() === staveNumber) ??
      Clef.default(partId, staveNumber)
    );
  }

  getClefs(): Clef[] {
    return this.clefs;
  }

  getKey(partId: string, staveNumber: number): Key {
    return (
      this.keys.find((k) => k.getPartId() === partId && k.getStaveNumber() === staveNumber) ??
      Key.default(partId, staveNumber)
    );
  }

  getPreviousKey(partId: string, staveNumber: number): Key | null {
    return this.keys.find((k) => k.getPartId() === partId && k.getStaveNumber() === staveNumber) ?? null;
  }

  getKeys(): Key[] {
    return this.keys;
  }

  getTime(partId: string, staveNumber: number): Time {
    return (
      this.times.find((t) => t.getPartId() === partId && t.getStaveNumber() === staveNumber) ??
      Time.default(partId, staveNumber)
    );
  }

  getTimes(): Time[] {
    return this.times;
  }

  getChanges(): SignatureChange[] {
    return this.changes;
  }

  hasChanges(): boolean {
    return this.changes.length > 0;
  }
}

class SignatureBuilder {
  private previousSignature = Signature.default();
  private metronome: musicxml.Metronome | null = null;
  private attributes = new Map<string, musicxml.Attributes>();

  setPreviousSignature(signature: Signature): SignatureBuilder {
    this.previousSignature = signature;
    return this;
  }

  addMetronome(musicXML: { metronome: musicxml.Metronome }): SignatureBuilder {
    this.metronome = musicXML.metronome;
    return this;
  }

  addAttributes(partId: string, musicXML: { attributes: musicxml.Attributes }): SignatureBuilder {
    this.attributes.set(partId, musicXML.attributes);
    return this;
  }

  build(): Signature {
    const metronome = this.buildMetronome();
    const staveCounts = this.buildStaveCounts();
    const staveLineCounts = this.buildStaveLineCounts();
    const clefs = this.buildClefs();
    const keys = this.buildKeys();
    const times = this.buildTimes();

    const changes = [
      ...this.diffMetronome(metronome),
      ...this.diffStaveCounts(staveCounts),
      ...this.diffStaveLineCounts(staveLineCounts),
      ...this.diffClefs(clefs),
      ...this.diffKeys(keys),
      ...this.diffTimes(times),
    ];

    return new Signature(metronome, staveCounts, staveLineCounts, clefs, keys, times, changes);
  }

  private buildMetronome(): Metronome {
    const metronome = this.metronome;
    const mark = metronome?.getMark();
    if (metronome && mark) {
      return Metronome.fromMusicXML({ metronome, mark });
    }

    return Metronome.default();
  }

  private buildStaveCounts(): StaveCount[] {
    const next = new Array<StaveCount>();
    for (const [partId, attributes] of this.attributes) {
      const count = attributes.getStaveCount();
      if (typeof count === 'number') {
        next.push(new StaveCount(partId, count));
      } else {
        next.push(StaveCount.default(partId));
      }
    }

    const existing = new Array<StaveCount>();
    for (const staveCount of this.previousSignature.getStaveCounts()) {
      if (!this.attributes.has(staveCount.getPartId())) {
        existing.push(staveCount);
      }
    }

    return [...next, ...existing];
  }

  private buildStaveLineCounts(): StaveLineCount[] {
    const seen = new Array<{ partId: string; staveNumber: number }>();

    function isSeen(partId: string, staveNumber: number) {
      return seen.some((s) => s.partId === partId && s.staveNumber === staveNumber);
    }

    const next = new Array<StaveLineCount>();
    for (const [partId, attributes] of this.attributes) {
      for (const staveDetail of attributes.getStaveDetails()) {
        const staveNumber = staveDetail.getStaveNumber();
        if (isSeen(partId, staveNumber)) {
          continue;
        }
        seen.push({ partId, staveNumber });

        const staveLineCount = staveDetail.getStaveLines();
        next.push(new StaveLineCount(partId, staveNumber, staveLineCount));
      }
    }

    const existing = new Array<StaveLineCount>();
    for (const staveLineCount of this.previousSignature.getStaveLineCounts()) {
      if (!isSeen(staveLineCount.getPartId(), staveLineCount.getStaveNumber())) {
        existing.push(staveLineCount);
      }
    }

    return [...next, ...existing];
  }

  private buildClefs(): Clef[] {
    const seen = new Array<{ partId: string; staveNumber: number }>();

    function isSeen(partId: string, staveNumber: number) {
      return seen.some((s) => s.partId === partId && s.staveNumber === staveNumber);
    }

    const next = new Array<Clef>();
    for (const [partId, attributes] of this.attributes) {
      for (const clef of attributes.getClefs()) {
        const staveNumber = clef.getStaveNumber();
        if (isSeen(partId, staveNumber)) {
          continue;
        }
        seen.push({ partId, staveNumber });

        const line = clef.getLine();
        const sign = clef.getSign();
        const octaveChange = clef.getOctaveChange();
        next.push(new Clef(partId, staveNumber, line, sign, octaveChange));
      }
    }

    const existing = new Array<Clef>();
    for (const clef of this.previousSignature.getClefs()) {
      if (!isSeen(clef.getPartId(), clef.getStaveNumber())) {
        existing.push(clef);
      }
    }

    return [...next, ...existing];
  }

  private buildKeys(): Key[] {
    const seen = new Array<{ partId: string; staveNumber: number }>();

    function isSeen(partId: string, staveNumber: number) {
      return seen.some((s) => s.partId === partId && s.staveNumber === staveNumber);
    }

    const next = new Array<Key>();
    for (const [partId, attributes] of this.attributes) {
      for (const key of attributes.getKeys()) {
        const staveNumber = key.getStaveNumber();
        if (isSeen(partId, staveNumber)) {
          continue;
        }
        seen.push({ partId, staveNumber });

        const fifths = key.getFifthsCount();
        const mode = key.getMode();
        const previousKey = this.previousSignature.getPreviousKey(partId, staveNumber);
        next.push(new Key(partId, staveNumber, fifths, previousKey, mode));
      }
    }

    const existing = new Array<Key>();
    for (const key of this.previousSignature.getKeys()) {
      if (!this.attributes.has(key.getPartId())) {
        existing.push(key);
      }
    }

    return [...next, ...existing];
  }

  private buildTimes(): Time[] {
    return [];
  }

  private diffMetronome(metronome: Metronome): SignatureChange[] {
    if (metronome.isEqual(this.previousSignature.getMetronome())) {
      return [];
    } else {
      return [{ type: 'metronome' }];
    }
  }

  private diffStaveCounts(staveCounts: StaveCount[]): SignatureChange[] {
    return staveCounts
      .filter((s) => !s.isEqual(this.previousSignature.getStaveCount(s.getPartId())))
      .map((s) => ({ type: 'stavecount', partId: s.getPartId() }));
  }

  private diffStaveLineCounts(staveLineCounts: StaveLineCount[]): SignatureChange[] {
    return staveLineCounts
      .filter((s) => !s.isEqual(this.previousSignature.getStaveLineCount(s.getPartId(), s.getStaveNumber())))
      .map((s) => ({ type: 'stavelinecount', partId: s.getPartId(), staveNumber: s.getStaveNumber() }));
  }

  private diffClefs(clefs: Clef[]): SignatureChange[] {
    return clefs
      .filter((c) => !c.isEqual(this.previousSignature.getClef(c.getPartId(), c.getStaveNumber())))
      .map((c) => ({ type: 'clef', partId: c.getPartId(), staveNumber: c.getStaveNumber() }));
  }

  private diffKeys(keys: Key[]): SignatureChange[] {
    return keys
      .filter((k) => !k.isEqual(this.previousSignature.getKey(k.getPartId(), k.getStaveNumber())))
      .map((k) => ({ type: 'key', partId: k.getPartId(), staveNumber: k.getStaveNumber() }));
  }

  private diffTimes(times: Time[]): SignatureChange[] {
    return times
      .filter((t) => !t.isEqual(this.previousSignature.getTime(t.getPartId(), t.getStaveNumber())))
      .map((t) => ({ type: 'time', partId: t.getPartId(), staveNumber: t.getStaveNumber() }));
  }
}
