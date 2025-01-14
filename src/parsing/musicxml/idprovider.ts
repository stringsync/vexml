export class IdProvider {
  private id = 1;

  next(): string {
    return `${this.id++}`;
  }
}
