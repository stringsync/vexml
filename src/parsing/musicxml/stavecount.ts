export class StaveCount {
  constructor(private partId: string, private value: number) {}

  static default(partId: string): StaveCount {
    return new StaveCount(partId, 1);
  }

  getPartId(): string {
    return this.partId;
  }

  getValue(): number {
    return this.value;
  }

  isEqual(staveCount: StaveCount): boolean {
    return this.partId === staveCount.partId && this.isEquivalent(staveCount);
  }

  isEquivalent(staveCount: StaveCount): boolean {
    return this.value === staveCount.value;
  }
}
