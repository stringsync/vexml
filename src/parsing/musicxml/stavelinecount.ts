export class StaveLineCount {
  static default() {
    return new StaveLineCount();
  }

  getPartId(): string {
    return '';
  }

  getStaveNumber(): number {
    return 1;
  }

  getLineCount(): number {
    return 5;
  }
}
