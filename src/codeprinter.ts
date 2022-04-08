import { BiMap } from './bimap';
import { Expression } from './expression';

export class CodePrinterError extends Error {}

// These aliases are used to help self-document some ambiguous types.
type Literal = string;
type AnyResult = any;
type VariableName = string;
type AnyObject = Record<any, any>;

export class CodePrinter {
  private literals: Map<AnyResult, Literal> = new Map();
  private variables = BiMap.create<VariableName, AnyObject>();
  private proxies = BiMap.create<VariableName, AnyObject>();
  private buffer = new Array<string>();

  watch<T extends AnyObject>(variableName: string, expression: Expression<T>): T {
    const target = expression.value;
    const proxy = this.createProxy(variableName, target);
    this.declare(variableName, expression);
    this.registerVariable(variableName, target);
    this.registerProxy(variableName, proxy);
    return proxy;
  }

  newline(): void {
    this.record('\n');
  }

  comment(comment: string): void {
    if (comment.startsWith('//') || comment.startsWith('/*')) {
      throw new CodePrinterError('do not add comment symbols');
    }
    this.record(`// ${comment}`);
  }

  flush(): string[] {
    const buffer = this.buffer;
    this.buffer = [];
    return buffer;
  }

  size(): number {
    return this.buffer.length;
  }

  private createProxy<T extends AnyObject>(variableName: VariableName, target: T): T {
    for (const [key, value] of Object.entries(target)) {
      if (typeof value === 'function') {
        target[key as keyof T] = new Proxy(value, {
          apply: (target, thisArg, argumentsList) => {
            return this.recordedApply(target, key, thisArg, argumentsList);
          },
        }).bind(target);
      }
      if (typeof value === 'object') {
        target[key as keyof T] = this.createProxy(`${variableName}.${key}`, value);
      }
    }

    const proxy = new Proxy(target, {
      get: (target, key, receiver) => {
        return this.recordedGet(variableName, target, key, receiver);
      },
      set: (target, key, value, receiver) => {
        return this.recordedSet(variableName, target, key, value, receiver);
      },
    });

    return proxy;
  }

  private record(literal: Literal) {
    this.buffer.push(literal);
  }

  private declare(variableName: VariableName, expression: Expression<any>) {
    const literal = this.computeDeclarationLiteral(variableName, expression);
    this.record(`${literal};`);
  }

  private recordedApply(target: CallableFunction, prop: string, thisArg: any, argumentsList: any[]) {
    const result = Reflect.apply(target, thisArg, argumentsList);
    const variableName = this.fetchVariableName(thisArg);
    const literal = this.computeInvokeLiteral(variableName, prop, argumentsList);
    this.registerLiteral(result, literal);
    this.record(`${literal};`);
    return result;
  }

  private recordedGet(variableName: VariableName, target: AnyObject, key: string | symbol, receiver: any) {
    const result = Reflect.get(target, key, receiver);
    const literal = this.computeGetterLiteral(variableName, key);
    this.registerLiteral(result, literal);
    return result;
  }

  private recordedSet(variableName: VariableName, target: AnyObject, key: string | symbol, value: any, receiver: any) {
    const result = Reflect.set(target, key, value, receiver);
    const literal = this.computeSetterLiteral(variableName, key, value);
    this.record(`${literal};`);

    // If we're setting an object, we need to reproxy the structure.
    if (typeof value === 'object') {
      const proxy = this.createProxy(variableName, target);
      this.reregisterVariable(variableName, target);
      this.reregisterProxy(variableName, proxy);
    }

    return result;
  }

  private registerVariable(variableName: VariableName, target: AnyObject) {
    if (this.variables.has(variableName)) {
      throw new CodePrinterError(`variable is already being watched, use a different name: ${variableName}`);
    }
    if (this.proxies.has(variableName)) {
      throw new CodePrinterError(`variable is already being proxied, something internally went wrong: ${variableName}`);
    }
    this.variables.set(variableName, target);
  }

  private reregisterVariable(variableName: VariableName, target: AnyObject) {
    this.variables.delete(variableName);
    this.variables.set(variableName, target);
  }

  private registerProxy(variableName: VariableName, proxy: AnyObject) {
    if (!this.variables.has(variableName)) {
      throw new CodePrinterError(`variable must be watched before setting a proxy: ${variableName}`);
    }
    if (this.proxies.has(variableName)) {
      throw new CodePrinterError(`variable is already being proxied, something internally went wrong: ${variableName}`);
    }
    this.proxies.set(variableName, proxy);
  }

  private reregisterProxy(variableName: VariableName, proxy: AnyObject) {
    this.proxies.delete(variableName);
    this.proxies.set(variableName, proxy);
  }

  private registerLiteral(result: AnyResult, literal: Literal) {
    this.literals.set(result, literal);
  }

  private fetchVariableName(target: AnyObject): VariableName {
    let variableName: string | undefined = undefined;

    variableName = this.variables.invert().get(target);
    if (typeof variableName === 'string') {
      return variableName;
    }

    variableName = this.proxies.invert().get(target);
    if (typeof variableName === 'string') {
      return variableName;
    }

    throw new CodePrinterError(`could not find variable name for \`this\`: ${target}`);
  }

  private fetchLiteral(result: AnyResult): string {
    const literal = this.literals.get(result);
    if (typeof literal !== 'string') {
      throw new CodePrinterError(`expected literal to be registered for result: ${result}`);
    }
    return literal;
  }

  private computeDeclarationLiteral(variableName: VariableName, expression: Expression<any>): string {
    return `const ${variableName} = ${expression.toString()}`;
  }

  private computeGetterLiteral(variableName: VariableName, key: string | symbol): string {
    if (typeof key === 'symbol') {
      return `${variableName}[${key.toString()}]`;
    }
    if (key.includes('-')) {
      return `${variableName}['${key.toString()}']`;
    }
    if (Number.isInteger(parseInt(key))) {
      return `${variableName}[${key}]`;
    }
    return `${variableName}.${key}`;
  }

  private computeSetterLiteral(variableName: VariableName, key: string | symbol, value: any): string {
    const getterLiteral = this.computeGetterLiteral(variableName, key);
    return `${getterLiteral} = ${this.toLiteral(value)}`;
  }

  private computeInvokeLiteral(variableName: VariableName, key: string, argumentsList: any[]): string {
    const getterLiteral = this.computeGetterLiteral(variableName, key);
    const argsLiteral = argumentsList.map((arg) => this.toLiteral(arg)).join(', ');
    return `${getterLiteral}(${argsLiteral})`;
  }

  private toLiteral(value: any): string {
    // Use a variable name if it corresponds to the value.
    try {
      return this.fetchVariableName(value);
    } catch (e) {
      // noop
    }

    // Use a recorded result if it exists.
    try {
      return this.fetchLiteral(value);
    } catch (e) {
      // noop
    }

    // Otherwise, make a best effort to convert the value to a literal representation of it.
    switch (typeof value) {
      case 'string':
        return `'${value}'`;
      case 'number':
      case 'boolean':
        return `${value}`;
    }
    if (Array.isArray(value)) {
      return `[${value.map(this.toLiteral.bind(this)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const pairs = new Array<string>();
      for (const [k, v] of Object.entries(value)) {
        const keyLiteral = k.includes('-') ? `'${k}'` : k;
        const valueLiteral = this.toLiteral(v);
        pairs.push(`${keyLiteral}: ${valueLiteral}`);
      }
      return pairs.length > 0 ? `{ ${pairs.join(', ')} }` : '{}';
    }

    throw new CodePrinterError(`cannot change value to literal: ${value}`);
  }
}
