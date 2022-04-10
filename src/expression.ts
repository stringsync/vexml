import * as esprima from 'esprima';
import * as estree from 'estree';

const DOUBLE_SPACE = '  ';

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
    throw new Error('invalid expression, please use a simple arrow function');
  }

  if (program.body[0].type !== 'ExpressionStatement') {
    throw new Error(`expected expression, got: ${program.body[0].type}`);
  }

  const expression = program.body[0].expression;
  if (expression.type !== 'ArrowFunctionExpression') {
    throw new Error(`expected arrow function, got: ${expression.type}`);
  }

  const params = expression.params;
  if (params.length > 0) {
    throw new Error(`expected zero function params, got: ${params.length}`);
  }

  let scope: estree.SourceLocation;
  if (expression.body.type === 'BlockStatement') {
    // explicit return
    const blockStatement = expression.body;
    if (blockStatement.body.length !== 1) {
      throw new Error('invalid expression, please use a simple arrow function');
    }
    if (blockStatement.body[0].type !== 'ReturnStatement') {
      throw new Error(`expected return statement, got: ${blockStatement.body[0].type}`);
    }
    if (!blockStatement.body[0].argument) {
      throw new Error('expected return statement to have argument');
    }
    scope = blockStatement.body[0].argument.loc!;
  } else {
    // implicit return
    scope = expression.body.loc!;
  }

  return program
    .tokens!.filter(isWithinScope(scope))
    .map((token) => token.value)
    .join('')
    .split('')
    .join('')
    .replaceAll('new', 'new ')
    .replaceAll(':', ': ')
    .replaceAll('{', '{ ')
    .replaceAll('}', ' }')
    .replaceAll(',', ', ')
    .replaceAll(DOUBLE_SPACE, '');
};

const isWithinScope =
  (scope: estree.SourceLocation) =>
  (token: esprima.Token): boolean => {
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
