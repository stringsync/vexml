import { BiMap } from './bimap';

class CodePrinterError extends Error {}

// These aliases are used to self-document the Map<K, V> types.
type Literal = string;
type AnyResult = any;
type VariableName = string;
type AnyTarget = any;

export class CodePrinter {
  private literals: Map<AnyResult, Literal> = new Map();
  private variables = BiMap.create<VariableName, AnyTarget>();
  private buffer = new Array<string>();

  watch<T extends Record<any, any>>(target: T, variableName: string): T {
    this.registerVariable(variableName, target);

    // Track function calls
    for (const [prop, value] of Object.entries(target)) {
      if (typeof value === 'function') {
        target[prop as keyof T] = new Proxy(value, {
          apply: (target, thisArg, argumentsList) => {
            const result = Reflect.apply(target, thisArg, argumentsList);
            const variableName = this.getVariableName(thisArg);
            const literal = this.getInvokeLiteral(variableName, prop, argumentsList);
            this.registerLiteral(result, literal);
            this.buffer.push(literal);
            return result;
          },
        });
      }
    }

    // Track setter and getter calls
    return new Proxy(target, {
      get: (target, propertyKey, receiver) => {
        const result = Reflect.get(target, propertyKey, receiver);
        const literal = this.getGetterLiteral(variableName, propertyKey);
        this.registerLiteral(result, literal);
        return result;
      },
      set: (target, propertyKey, value, receiver) => {
        const result = Reflect.set(target, propertyKey, value, receiver);
        const literal = this.getSetterLiteral(variableName, propertyKey, value);
        this.buffer.push(literal);
        return result;
      },
    });
  }

  flush(): string[] {
    const buffer = this.buffer;
    this.buffer = [];
    return buffer;
  }

  private registerVariable(variableName: VariableName, target: AnyTarget) {
    if (this.variables.has(variableName)) {
      throw new CodePrinterError(`variable is already being watched, use a different name: ${variableName}`);
    }
    this.variables.set(variableName, target);
  }

  private getVariable(variableName: VariableName): AnyTarget {
    if (!this.variables.has(variableName)) {
      throw new CodePrinterError(`not target found for variableName: ${variableName}`);
    }
    return this.variables.get(variableName);
  }

  private getVariableName(target: AnyTarget): VariableName {
    if (!this.variables.invert().has(target)) {
      throw new CodePrinterError(`target is not being watched, check the \`this\` context: ${target}`);
    }

    const variableName = this.variables.invert().get(target);
    if (typeof variableName === 'string') {
      return variableName;
    }

    throw new CodePrinterError(`could not find variable name for target: ${target}`);
  }

  private registerLiteral(result: AnyResult, literal: Literal) {
    this.literals.set(result, literal);
  }

  private getLiteral(result: AnyResult): string | null {
    return this.literals.get(result) ?? null;
  }

  private getGetterLiteral(variableName: VariableName, propertyKey: string | symbol): string {
    if (typeof propertyKey === 'symbol') {
      throw new CodePrinterError(`cannot handle code printing symbol: ${propertyKey.toString()}`);
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
    const maybeLiteral = this.getLiteral(value);
    if (maybeLiteral !== null) {
      return maybeLiteral;
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
      return `{${pairs.join(', ')}}`;
    }

    throw new CodePrinterError(`cannot change value to literal: ${value}`);
  }

  private isInteger(value: string): boolean {
    return Number.isInteger(parseInt(value));
  }
}
