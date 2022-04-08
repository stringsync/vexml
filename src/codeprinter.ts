import { BiMap } from './bimap';
import { Expression } from './expression';

class CodePrinterError extends Error {}

// These aliases are used to help self-document some ambiguous types.
type Literal = string;
type AnyResult = any;
type VariableName = string;
type AnyObject = Record<any, any>;
type AnyTarget = AnyObject;

export class CodePrinter {
  private literals: Map<AnyResult, Literal> = new Map();
  private variables = BiMap.create<VariableName, AnyTarget>();
  private proxies = BiMap.create<VariableName, AnyTarget>();
  private buffer = new Array<string>();

  watch<T extends AnyObject>(variableName: string, expression: Expression<T>): T {
    const target = expression.value;
    const proxy = this.createProxy(variableName, target);
    this.declare(variableName, expression);
    this.registerVariable(variableName, target);
    this.registerProxy(variableName, proxy);
    return proxy;
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
    // Track function calls
    for (const [prop, value] of Object.entries(target)) {
      if (typeof value === 'function') {
        target[prop as keyof T] = new Proxy(value, {
          apply: (target, thisArg, argumentsList) => {
            const result = Reflect.apply(target, thisArg, argumentsList);
            const variableName = this.getVariableName(thisArg);
            const literal = this.getInvokeLiteral(variableName, prop, argumentsList);
            this.registerLiteral(result, literal);
            this.push(literal);
            return result;
          },
        }).bind(target);
      }
    }

    // Track setter and getter calls
    const proxy = new Proxy(target, {
      get: (target, propertyKey, receiver) => {
        const result = Reflect.get(target, propertyKey, receiver);
        const literal = this.getGetterLiteral(variableName, propertyKey);
        this.registerLiteral(result, literal);
        return result;
      },
      set: (target, propertyKey, value, receiver) => {
        const result = Reflect.set(target, propertyKey, value, receiver);
        const literal = this.getSetterLiteral(variableName, propertyKey, value);
        this.push(literal);
        return result;
      },
    });

    return proxy;
  }

  private push(literal: Literal) {
    this.buffer.push(`${literal};`);
  }

  private declare(variableName: VariableName, expression: Expression<any>) {
    this.push(this.getDeclarationLiteral(variableName, expression));
  }

  private registerProxy(variableName: VariableName, proxy: AnyTarget) {
    if (!this.variables.has(variableName)) {
      throw new CodePrinterError(`variable must be watched before setting a proxy: ${variableName}`);
    }
    if (this.proxies.has(variableName)) {
      throw new CodePrinterError(`variable is already being proxied, something internally went wrong: ${variableName}`);
    }
    this.proxies.set(variableName, proxy);
  }

  private registerVariable(variableName: VariableName, target: AnyTarget) {
    if (this.variables.has(variableName)) {
      throw new CodePrinterError(`variable is already being watched, use a different name: ${variableName}`);
    }
    if (this.proxies.has(variableName)) {
      throw new CodePrinterError(`variable is already being proxied, something internally went wrong: ${variableName}`);
    }
    this.variables.set(variableName, target);
  }

  private getVariableName(target: AnyTarget): VariableName {
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

  private registerLiteral(result: AnyResult, literal: Literal) {
    this.literals.set(result, literal);
  }

  private getDeclarationLiteral(variableName: VariableName, expression: Expression<any>): string {
    return `const ${variableName} = ${expression.toString()}`;
  }

  private getLiteral(result: AnyResult): string {
    const literal = this.literals.get(result);
    if (typeof literal !== 'string') {
      throw new CodePrinterError(`expected literal to be registered for result: ${result}`);
    }
    return literal;
  }

  private getGetterLiteral(variableName: VariableName, propertyKey: string | symbol): string {
    if (typeof propertyKey === 'symbol') {
      return `${variableName}[${propertyKey.toString()}]`;
    }
    if (propertyKey.includes('-')) {
      return `${variableName}['${propertyKey.toString()}']`;
    }
    if (this.isInteger(propertyKey)) {
      return `${variableName}[${propertyKey}]`;
    }
    return `${variableName}.${propertyKey}`;
  }

  private getSetterLiteral(variableName: VariableName, propertyKey: string | symbol, value: any): string {
    const getterLiteral = this.getGetterLiteral(variableName, propertyKey);
    return `${getterLiteral} = ${this.toLiteral(value)}`;
  }

  private getInvokeLiteral(variableName: VariableName, propertyKey: string, argumentsList: any[]): string {
    const getterLiteral = this.getGetterLiteral(variableName, propertyKey);
    const argsLiteral = argumentsList.map((arg) => this.toLiteral(arg)).join(', ');
    return `${getterLiteral}(${argsLiteral})`;
  }

  private toLiteral(value: any): string {
    try {
      return this.getVariableName(value);
    } catch (e) {
      // noop
    }

    try {
      return this.getLiteral(value);
    } catch (e) {
      // noop
    }

    switch (typeof value) {
      case 'string':
        return `'${value}'`;
      case 'number':
        return `${value}`;
      case 'boolean':
        return `${value}`;
    }

    if (Array.isArray(value)) {
      return `[${value.map(this.toLiteral.bind(this)).join(', ')}]`;
    }

    if (typeof value === 'object') {
      const pairs = new Array<string>();
      for (const [prop, v] of Object.entries(value)) {
        const key = prop.includes('-') ? `'${prop}'` : prop;
        pairs.push(`${key}: ${this.toLiteral(v)}`);
      }
      return pairs.length > 0 ? `{ ${pairs.join(', ')} }` : '{}';
    }

    throw new CodePrinterError(`cannot change value to literal: ${value}`);
  }

  private isInteger(value: string): boolean {
    return Number.isInteger(parseInt(value));
  }
}
