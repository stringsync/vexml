/** The type of address. */
export type AddressType = 'system' | 'part' | 'measure' | 'measurefragment' | 'stave' | 'chorus' | 'voice';

/** Any type of address. */
export type AnyAddress = Address<AddressType>;

/** A system address. */
export type SystemAddress = Address<'system'>;

/** A part address. */
export type PartAddress = Address<'part'>;

/** A measure address. */
export type MeasureAddress = Address<'measure'>;

/** A measure fragment address. */
export type MeasureFragmentAddress = Address<'measurefragment'>;

/** A stave address. */
export type StaveAddress = Address<'stave'>;

/** A chorus address. */
export type ChorusAddress = Address<'chorus'>;

/** A voice address. */
export type VoiceAddress = Address<'voice'>;

/** The location of a musical object in the rendering hierarchy. */
export class Address<T extends AddressType> {
  private type: T;
  private id: symbol;
  private parent: AnyAddress | null;
  private children: AnyAddress[];

  private constructor(opts: { type: T; id: symbol; parent: AnyAddress | null }) {
    this.type = opts.type;
    this.id = opts.id;
    this.parent = opts.parent;
    this.children = [];
  }

  /** Creates an address for a system. */
  static system(): Address<'system'> {
    return Address.create('system', null);
  }

  private static create<T extends AddressType>(type: T, parent: AnyAddress | null): Address<T> {
    const id = Symbol(type);
    const address = new Address({ type, id, parent });
    parent?.children.push(address);
    return address;
  }

  /** Creates an address for a part. */
  part(): Address<'part'> {
    return Address.create('part', this);
  }

  /** Creates an address for a measure. */
  measure(): Address<'measure'> {
    return Address.create('measure', this);
  }

  /** Creates an address for a measure fragment. */
  measureFragment(): Address<'measurefragment'> {
    return Address.create('measurefragment', this);
  }

  /** Creates an address for a stave. */
  stave(): Address<'stave'> {
    return Address.create('stave', this);
  }

  /** Creates an address for a chorus. */
  chorus(): Address<'chorus'> {
    return Address.create('chorus', this);
  }

  /** Creates an address for a voice. */
  voice(): Address<'voice'> {
    return Address.create('voice', this);
  }

  /**
   * Whether the address belongs to the same type in its lineage.
   *
   * @throws {Error} when the type is not part of either address's lineage (including self).
   */
  hasTheSame(type: AddressType, address: AnyAddress): boolean {
    const address1 = this.getType(type);
    if (!address1) {
      throw new Error(`self address must have type '${type}' in its lineage, got null`);
    }

    const address2 = address.getType(type);
    if (!address2) {
      throw new Error(`other address must have type '${type}' in its lineage, got null`);
    }

    return address1.id === address2.id;
  }

  private getType<T extends AddressType>(type: T): Address<T> | null {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: AnyAddress | null = this;
    while (node !== null) {
      if (node.type === type) {
        return node as Address<T>;
      }
      node = node.parent;
    }
    return null;
  }
}
