import * as util from '@/util';

describe('decorators', () => {
  describe('memoize', () => {
    describe('on a method with no args', () => {
      class NoArgs {
        private callCount: number;

        constructor() {
          this.callCount = 0;
        }

        @util.memoize()
        echo(value: symbol): symbol {
          this.callCount++;
          return value;
        }

        getNumCalls(): number {
          return this.callCount;
        }
      }

      it('memoizes the method', () => {
        const value = Symbol();

        const instance = new NoArgs();

        expect(instance.echo(value)).toBe(value);
        expect(instance.echo(value)).toBe(value);
        expect(instance.getNumCalls()).toBe(1);
      });

      it('has a unique memo per instance', () => {
        const value1 = Symbol('1');
        const value2 = Symbol('2');

        const instance1 = new NoArgs();
        const instance2 = new NoArgs();

        expect(instance1.echo(value1)).toBe(value1);
        expect(instance2.echo(value2)).toBe(value2);
      });
    });

    describe('on a method with a single arg', () => {
      class SingleArg {
        private callCount: number;

        constructor() {
          this.callCount = 0;
        }

        @util.memoize()
        echo(value: symbol): symbol {
          this.callCount++;
          return value;
        }

        getNumCalls(): number {
          return this.callCount;
        }
      }

      it('memoizes the method', () => {
        const value = Symbol('1');

        const instance = new SingleArg();

        expect(instance.echo(value)).toBe(value);
        expect(instance.echo(value)).toBe(value);
        expect(instance.getNumCalls()).toBe(1);
      });

      it('has a unique memo per instance', () => {
        const value1 = Symbol('1');
        const value2 = Symbol('2');

        const instance1 = new SingleArg();
        const instance2 = new SingleArg();

        expect(instance1.echo(value1)).toBe(value1);
        expect(instance2.echo(value2)).toBe(value2);
      });
    });

    describe('on a method with a multiple args', () => {
      class MultiArgs {
        private callCount: number;

        constructor() {
          this.callCount = 0;
        }

        @util.memoize()
        echo(value1: symbol, value2: symbol): symbol[] {
          this.callCount++;
          return [value1, value2];
        }

        getNumCalls(): number {
          return this.callCount;
        }
      }

      it('memoizes the method', () => {
        const value1 = Symbol('1');
        const value2 = Symbol('2');

        const instance = new MultiArgs();

        expect(instance.echo(value1, value2)).toStrictEqual([value1, value2]);
        expect(instance.echo(value1, value2)).toStrictEqual([value1, value2]);
        expect(instance.getNumCalls()).toBe(1);
      });
    });

    describe('on a method with variadic args', () => {
      class VariadicArgs {
        private callCount: number;

        constructor() {
          this.callCount = 0;
        }

        @util.memoize({ degree: 2 })
        echo(...values: symbol[]): symbol[] {
          this.callCount++;
          return values;
        }

        getNumCalls(): number {
          return this.callCount;
        }
      }

      it('memoizes the method', () => {
        const value1 = Symbol('1');
        const value2 = Symbol('2');

        const instance = new VariadicArgs();

        expect(instance.echo(value1, value2)).toStrictEqual([value1, value2]);
        expect(instance.echo(value1, value2)).toStrictEqual([value1, value2]);

        expect(instance.echo(value1)).toStrictEqual([value1]);
        expect(instance.echo(value1)).toStrictEqual([value1]);

        expect(instance.echo(value1, value2)).toStrictEqual([value1, value2]);
        expect(instance.echo(value1)).toStrictEqual([value1]);

        expect(instance.getNumCalls()).toBe(2);
      });
    });

    describe('using a degree greater than 1', () => {
      class DegreeGtOneArg {
        private callCount: number;

        constructor() {
          this.callCount = 0;
        }

        @util.memoize({ degree: 2 })
        echo(value: symbol): symbol {
          this.callCount++;
          return value;
        }

        getNumCalls(): number {
          return this.callCount;
        }
      }

      it('memoizes the method with multiple values', () => {
        const value1 = Symbol('1');
        const value2 = Symbol('2');

        const instance = new DegreeGtOneArg();

        expect(instance.echo(value1)).toBe(value1);
        expect(instance.echo(value2)).toBe(value2);

        expect(instance.echo(value1)).toBe(value1);
        expect(instance.echo(value2)).toBe(value2);

        expect(instance.getNumCalls()).toBe(2);
      });

      it('overwrites the memo when at capacity', () => {
        const value1 = Symbol('1');
        const value2 = Symbol('2');
        const value3 = Symbol('3');

        const instance = new DegreeGtOneArg();

        expect(instance.echo(value1)).toBe(value1);
        expect(instance.echo(value2)).toBe(value2);
        expect(instance.echo(value3)).toBe(value3);

        expect(instance.echo(value1)).toBe(value1);
        expect(instance.echo(value2)).toBe(value2);
        expect(instance.echo(value3)).toBe(value3);

        expect(instance.getNumCalls()).toBe(6);
      });
    });
  });
});
