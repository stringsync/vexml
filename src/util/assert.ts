export function assertNotNull<T>(value: T): asserts value is Exclude<T, null> {
  if (value === null) {
    throw new Error(`expected value to be present, got: ${value}`);
  }
}

export function assertNull(value: any): asserts value is null {
  if (value !== null) {
    throw new Error(`expected value to be null, got: ${value}`);
  }
}

export function assertDefined<T>(value: T): asserts value is Exclude<T, undefined> {
  if (typeof value === 'undefined') {
    throw new Error(`expected value to be defined, got: ${value}`);
  }
}

export function assert(condition: any, msg: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}
