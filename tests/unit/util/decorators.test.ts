import * as util from '@/util';

describe('decorators', () => {
  describe('memoize', () => {
    class Foo {
      private callCount: number;

      constructor(private value: symbol) {
        this.callCount = 0;
      }

      @util.memoize()
      getValue(): symbol {
        this.callCount++;
        return this.value;
      }

      getNumCalls(): number {
        return this.callCount;
      }
    }

    it('memoizes the method', () => {
      const value = Symbol();

      const foo = new Foo(value);

      expect(foo.getValue()).toBe(value);
      expect(foo.getValue()).toBe(value);
      expect(foo.getNumCalls()).toBe(1);
    });

    it('has a unique memo per instance', () => {
      const value1 = Symbol('1');
      const value2 = Symbol('2');

      const foo1 = new Foo(value1);
      const foo2 = new Foo(value2);

      expect(foo1.getValue()).toBe(value1);
      expect(foo2.getValue()).toBe(value2);
    });
  });
});
