import * as util from '@/util';

/** The type of address. */
export type AddressType = 'system' | 'part' | 'measure' | 'measurefragment' | 'stave' | 'chorus' | 'voice';

/** Additional data attached to the address. */
export type AddressContext<T extends AddressType> = T extends 'system'
  ? { systemIndex: number; origin: string }
  : T extends 'part'
  ? { partId: string }
  : T extends 'measure'
  ? { systemMeasureIndex: number; measureIndex: number }
  : T extends 'measurefragment'
  ? { measureFragmentIndex: number }
  : T extends 'stave'
  ? { staveNumber: number }
  : T extends 'chorus'
  ? Record<never, never>
  : T extends 'voice'
  ? { voiceIndex: number }
  : never;

/** The location of a musical object in the rendering hierarchy. */
export class Address<T extends AddressType = AddressType> {
  private type: T;
  private id: symbol;
  private parent: Address | null;
  private children: Address[];
  private context: AddressContext<T>;

  private constructor(opts: { type: T; id: symbol; parent: Address | null; context: AddressContext<T> }) {
    this.type = opts.type;
    this.id = opts.id;
    this.parent = opts.parent;
    this.context = opts.context;
    this.children = [];
  }

  /** Creates an address for a system. */
  static system(context: AddressContext<'system'>): Address<'system'> {
    return Address.create('system', null, context);
  }

  private static create<T extends AddressType>(
    type: T,
    parent: Address | null,
    context: AddressContext<T>
  ): Address<T> {
    const id = Symbol(type);
    const address = new Address({ type, id, parent, context });
    parent?.children.push(address);
    return address;
  }

  /** Returns the current system index. */
  getSystemIndex(): number | undefined {
    const systemAddress = this.getAddress('system');
    util.assertNotNull(systemAddress);
    return systemAddress.context?.systemIndex;
  }

  /** Returns the current part ID. */
  getPartId(): string | undefined {
    const partAddress = this.getAddress('part');
    util.assertNotNull(partAddress);
    return partAddress.context?.partId;
  }

  /** Returns the system measure index. */
  getSystemMeasureIndex(): number | undefined {
    const measureAddress = this.getAddress('measure');
    util.assertNotNull(measureAddress);
    return measureAddress.context?.systemMeasureIndex;
  }

  /** Returns the measure index. */
  getMeasureIndex(): number | undefined {
    const measureAddress = this.getAddress('measure');
    util.assertNotNull(measureAddress);
    return measureAddress.context?.measureIndex;
  }

  /** Returns the measure fragment index. */
  getMeasureFragmentIndex(): number | undefined {
    const measureFragmentAddress = this.getAddress('measurefragment');
    util.assertNotNull(measureFragmentAddress);
    return measureFragmentAddress.context?.measureFragmentIndex;
  }

  /** Returns the stave number. */
  getStaveNumber(): number | undefined {
    const staveAddress = this.getAddress('stave');
    util.assertNotNull(staveAddress);
    return staveAddress.context?.staveNumber;
  }

  /** Returns the voice number. */
  getVoiceNumber(): number | undefined {
    const voiceAddress = this.getAddress('voice');
    util.assertNotNull(voiceAddress);
    return voiceAddress.context?.voiceIndex;
  }

  /** Creates an address for a part. */
  part(context: AddressContext<'part'>): Address<'part'> {
    this.assertThisIsA('system');
    return Address.create('part', this, context);
  }

  /** Creates an address for a measure. */
  measure(context: AddressContext<'measure'>): Address<'measure'> {
    this.assertThisIsA('part');
    return Address.create('measure', this, context);
  }

  /** Creates an address for a measure fragment. */
  measureFragment(context: AddressContext<'measurefragment'>): Address<'measurefragment'> {
    this.assertThisIsA('measure');
    return Address.create('measurefragment', this, context);
  }

  /** Creates an address for a stave. */
  stave(context: AddressContext<'stave'>): Address<'stave'> {
    this.assertThisIsA('measurefragment');
    return Address.create('stave', this, context);
  }

  /** Creates an address for a chorus. */
  chorus(): Address<'chorus'> {
    this.assertThisIsA('stave');
    return Address.create('chorus', this, {});
  }

  /** Creates an address for a voice. */
  voice(context: AddressContext<'voice'>): Address<'voice'> {
    this.assertThisIsA('chorus');
    return Address.create('voice', this, context);
  }

  /**
   * Whether the address belongs to the same type in its lineage.
   *
   * @throws {Error} when the type is not part of either address's lineage (including self).
   */
  isMemberOf(type: AddressType, address: Address): boolean {
    const address1 = this.getAddress(type);
    if (!address1) {
      throw new Error(`self address must have type '${type}' in its lineage, got null`);
    }

    const address2 = address.getAddress(type);
    if (!address2) {
      throw new Error(`other address must have type '${type}' in its lineage, got null`);
    }

    return address1.id === address2.id;
  }

  /**
   * Renders the address's hiearchy as a human-readable string.
   */
  toDebugString(): string {
    const stack = new Array<Address>();

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Address | null = this;
    while (node) {
      stack.push(node);
      node = node.parent;
    }

    const lines = new Array<string>();

    let depth = 0;
    node = stack.pop()!;
    while (node) {
      const spaces = '  '.repeat(depth);
      lines.push(`${spaces}type: ${node.type}`);
      const context = node.context ?? {};
      for (const [key, value] of Object.entries(context)) {
        lines.push(`${spaces}${key}: ${value}`);
      }
      depth++;
      node = stack.pop() ?? null;
    }

    return lines.join('\n');
  }

  private getAddress<S extends AddressType>(type: S): Address<S> | null {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Address | null = this;
    while (node !== null) {
      if (node.type === type) {
        return node as Address<S>;
      }
      node = node.parent;
    }
    return null;
  }

  private assertThisIsA<S extends AddressType>(type: S): asserts this is Address<S> {
    if ((this as Address).type !== type) {
      throw new Error(`must be of type '${type}', got: '${this.type}'`);
    }
  }
}
