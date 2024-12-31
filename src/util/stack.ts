export class Stack<T> {
  private items = new Array<T>();

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  clone(): Stack<T> {
    const stack = new Stack<T>();
    stack.items = [...this.items];
    return stack;
  }
}

export default Stack;
