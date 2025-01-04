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
  private metronome: Metronome | null = null;

  // partId -> StaveCount
  private staveCounts = new Map<string, StaveCount>();

  // partId -> staveNumber -> StaveLineCount
  private staveLineCounts = new Map<string, Map<number, StaveLineCount>>();

  // partId -> staveNumber -> Clef
  private clefs = new Map<string, Map<number, Clef>>();

  // partId -> staveNumber -> Key
  private keys = new Map<string, Map<number, Key>>();

  // partId -> staveNumber -> Time
  private times = new Map<string, Map<number, Time>>();

  setPreviousSignature(signature: Signature): SignatureBuilder {
    this.previousSignature = signature;
    return this;
  }

  setMetronome(metronome: Metronome): SignatureBuilder {
    this.metronome = metronome;
    return this;
  }

  addStaveCount(staveCount: StaveCount): SignatureBuilder {
    const partId = staveCount.getPartId();
    this.staveCounts.set(partId, staveCount);
    return this;
  }

  addStaveLineCount(staveLineCount: StaveLineCount): SignatureBuilder {
    const partId = staveLineCount.getPartId();
    const staveNumber = staveLineCount.getStaveNumber();

    if (!this.staveLineCounts.has(partId)) {
      this.staveLineCounts.set(partId, new Map());
    }
    this.staveLineCounts.get(partId)!.set(staveNumber, staveLineCount);

    return this;
  }

  addKey(key: Key): SignatureBuilder {
    const partId = key.getPartId();
    const staveNumber = key.getStaveNumber();

    if (!this.keys.has(partId)) {
      this.keys.set(partId, new Map());
    }
    this.keys.get(partId)!.set(staveNumber, key);

    return this;
  }

  addClef(clef: Clef): SignatureBuilder {
    const partId = clef.getPartId();
    const staveNumber = clef.getStaveNumber();

    if (!this.clefs.has(partId)) {
      this.clefs.set(partId, new Map());
    }
    this.clefs.get(partId)!.set(staveNumber, clef);

    return this;
  }

  addTime(time: Time): SignatureBuilder {
    const partId = time.getPartId();
    const staveNumber = time.getStaveNumber();

    if (!this.times.has(partId)) {
      this.times.set(partId, new Map());
    }
    this.times.get(partId)!.set(staveNumber, time);

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
    return this.metronome ?? Metronome.default();
  }

  private buildStaveCounts(): StaveCount[] {
    const next = this.staveCounts.values();

    const existing = new Array<StaveCount>();
    for (const staveCount of this.previousSignature.getStaveCounts()) {
      if (!this.staveCounts.has(staveCount.getPartId())) {
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
    for (const [partId, partStaveLineCounts] of this.staveLineCounts) {
      for (const [staveNumber, staveLineCount] of partStaveLineCounts) {
        if (isSeen(partId, staveNumber)) {
          continue;
        }
        seen.push({ partId, staveNumber });
        next.push(staveLineCount);
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
    for (const [partId, partClefs] of this.clefs) {
      for (const [staveNumber, clef] of partClefs) {
        if (isSeen(partId, staveNumber)) {
          continue;
        }
        seen.push({ partId, staveNumber });
        next.push(clef);
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
    for (const [partId, partKeys] of this.keys) {
      for (const [staveNumber, key] of partKeys) {
        if (isSeen(partId, staveNumber)) {
          continue;
        }
        seen.push({ partId, staveNumber });
        next.push(key);
      }
    }

    const existing = new Array<Key>();
    for (const key of this.previousSignature.getKeys()) {
      if (!this.keys.has(key.getPartId())) {
        existing.push(key);
      }
    }

    return [...next, ...existing];
  }

  private buildTimes(): Time[] {
    const seen = new Array<{ partId: string; staveNumber: number }>();

    function isSeen(partId: string, staveNumber: number) {
      return seen.some((s) => s.partId === partId && s.staveNumber === staveNumber);
    }

    const next = new Array<Time>();
    for (const [partId, partTimes] of this.times) {
      for (const [staveNumber, time] of partTimes) {
        if (isSeen(partId, staveNumber)) {
          continue;
        }
        seen.push({ partId, staveNumber });
        next.push(time);
      }
    }

    const existing = new Array<Time>();
    for (const time of this.previousSignature.getTimes()) {
      if (!isSeen(time.getPartId(), time.getStaveNumber())) {
        existing.push(time);
      }
    }

    return [...next, ...existing];
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
