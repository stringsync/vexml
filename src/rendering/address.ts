/** The location of a musical object in a score. */
export class Address {
  constructor(private systemId: symbol) {}

  /** Whether the other address is in the same system. */
  isSameSystem(address: Address): boolean {
    return this.systemId === address.systemId;
  }
}
