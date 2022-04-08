import * as esprima from 'esprima';
import * as estree from 'estree';

class ExpressionError extends Error {}

export class Expression<T> {
  static of<T>(getter: () => T): Expression<T> {
    const src = getter.toString();
    const value = getter();
    const expression = getReturnedExpressionLiteral(src);
    return new Expression(src, value, expression);
  }

  readonly src: string;
  readonly value: T;
  private expression: string;

  private constructor(src: string, value: T, expression: string) {
    this.src = src;
    this.value = value;
    this.expression = expression;
  }

  toString(): string {
    return this.expression;
  }
}

const getReturnedExpressionLiteral = (src: string): string => {
  const program = esprima.parseScript(src, { loc: true, tokens: true });

  if (program.body.length !== 1) {
    throw new ExpressionError('invalid expression, please use a simple arrow function');
  }

  if (program.body[0].type !== 'ExpressionStatement') {
    throw new ExpressionError(`expected expression, got: ${program.body[0].type}`);
  }

  const expression = program.body[0].expression;
  if (expression.type !== 'ArrowFunctionExpression') {
    throw new ExpressionError(`expected arrow function, got: ${expression.type}`);
  }

  const params = expression.params;
  if (params.length > 0) {
    throw new ExpressionError(`expected zero function params, got: ${params.length}`);
  }

  let scope: estree.SourceLocation;
  if (expression.body.type === 'BlockStatement') {
    // explicit return
    const blockStatement = expression.body;
    if (blockStatement.body.length !== 1) {
      throw new ExpressionError('invalid expression, please use a simple arrow function');
    }
    if (blockStatement.body[0].type !== 'ReturnStatement') {
      throw new ExpressionError(`expected return statement, got: ${blockStatement.body[0].type}`);
    }
    if (!blockStatement.body[0].argument) {
      throw new ExpressionError('expected return statement to have argument');
    }
    scope = blockStatement.body[0].argument.loc!;
  } else {
    // implicit return
    scope = expression.body.loc!;
  }

  const tokens = program
    .tokens!.filter((token) => isWithinScope(token, scope))
    .map((token) => token.value)
    .join('')
    .split('');

  const chars = [];
  for (const token of tokens) {
    switch (token) {
      case ':':
      case '{':
        chars.push(token);
        chars.push(' ');
        break;
      case '}':
        chars.push(' ');
        chars.push(token);
        break;
      case ',':
        chars.push(token);
        chars.push(' ');
        break;
      default:
        chars.push(token);
    }
  }
  return chars.join('');
};

const isWithinScope = (token: esprima.Token, scope: estree.SourceLocation): boolean => {
  // The esprima.Token type definition is missing loc, so we hack it.
  const loc = (token as any).loc as estree.SourceLocation;
  if (loc.start.line < scope.start.line) {
    return false;
  }
  if (loc.end.line > scope.end.line) {
    return false;
  }
  if (loc.start.line === scope.start.line && loc.start.column < scope.start.column) {
    return false;
  }
  if (loc.end.line === scope.end.line && loc.end.column > scope.end.column) {
    return false;
  }
  return true;
};
