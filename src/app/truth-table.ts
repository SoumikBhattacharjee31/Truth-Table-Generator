export type ExpressionNode =
  | { kind: "variable"; name: string }
  | { kind: "not"; operand: ExpressionNode }
  | {
      kind: "binary";
      operator: "+" | "*" | "^";
      left: ExpressionNode;
      right: ExpressionNode;
    };

export interface ParsedExpression {
  root: ExpressionNode;
  variables: string[];
}

export interface TruthTableRow {
  values: boolean[];
  result: boolean;
}

export interface TruthTable {
  expression: string;
  variables: string[];
  rows: TruthTableRow[];
}

export class ExpressionParseError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message);
    this.name = "ExpressionParseError";
  }
}

type TokenKind = "variable" | "+" | "*" | "^" | "'" | "(" | ")" | "end";

interface Token {
  kind: TokenKind;
  value: string;
  position: number;
}

const VARIABLE_LIMIT = 10;

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];

  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];
    if (/\s/.test(character)) continue;
    if (/[A-Za-z]/.test(character)) {
      tokens.push({ kind: "variable", value: character, position: index });
      continue;
    }
    if (["+", "*", "^", "'", "(", ")"].includes(character)) {
      tokens.push({
        kind: character as TokenKind,
        value: character,
        position: index,
      });
      continue;
    }
    throw new ExpressionParseError(
      `Unsupported character “${character}”.`,
      index,
    );
  }

  tokens.push({ kind: "end", value: "", position: expression.length });
  return tokens;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): ExpressionNode {
    const root = this.parseOr();
    const trailing = this.current();
    if (trailing.kind !== "end") {
      if (trailing.kind === "variable" || trailing.kind === "(") {
        throw new ExpressionParseError(
          "Expected an operator between expressions.",
          trailing.position,
        );
      }
      if (trailing.kind === ")") {
        throw new ExpressionParseError(
          "Closing parenthesis has no matching opening parenthesis.",
          trailing.position,
        );
      }
      throw new ExpressionParseError(
        `Unexpected “${trailing.value}”.`,
        trailing.position,
      );
    }
    return root;
  }

  private parseOr(): ExpressionNode {
    let node = this.parseAndXor();
    while (this.current().kind === "+") {
      this.advance();
      node = {
        kind: "binary",
        operator: "+",
        left: node,
        right: this.parseAndXor(),
      };
    }
    return node;
  }

  private parseAndXor(): ExpressionNode {
    let node = this.parsePostfix();
    while (this.current().kind === "*" || this.current().kind === "^") {
      const operator = this.advance().kind as "*" | "^";
      node = {
        kind: "binary",
        operator,
        left: node,
        right: this.parsePostfix(),
      };
    }
    return node;
  }

  private parsePostfix(): ExpressionNode {
    let node = this.parsePrimary();
    while (this.current().kind === "'") {
      this.advance();
      node = { kind: "not", operand: node };
    }
    return node;
  }

  private parsePrimary(): ExpressionNode {
    const token = this.current();
    if (token.kind === "variable") {
      this.advance();
      return { kind: "variable", name: token.value };
    }
    if (token.kind === "(") {
      this.advance();
      if (this.current().kind === ")") {
        throw new ExpressionParseError(
          "Parentheses cannot be empty.",
          this.current().position,
        );
      }
      const node = this.parseOr();
      if (this.current().kind !== ")") {
        throw new ExpressionParseError(
          "Missing a closing parenthesis.",
          this.current().position,
        );
      }
      this.advance();
      return node;
    }
    if (token.kind === "end") {
      throw new ExpressionParseError(
        "The expression ends before an operand was provided.",
        token.position,
      );
    }
    if (token.kind === "'") {
      throw new ExpressionParseError(
        "NOT (') must follow a variable or parenthesized expression.",
        token.position,
      );
    }
    throw new ExpressionParseError(
      `Expected a variable or “(”, but found “${token.value}”.`,
      token.position,
    );
  }

  private current(): Token {
    return this.tokens[this.index];
  }

  private advance(): Token {
    const token = this.current();
    this.index += 1;
    return token;
  }
}

export function parseExpression(expression: string): ParsedExpression {
  if (expression.trim().length === 0) {
    throw new ExpressionParseError(
      "Enter a logical expression to continue.",
      0,
    );
  }

  const tokens = tokenize(expression);
  const variables = [
    ...new Set(
      tokens
        .filter((token) => token.kind === "variable")
        .map((token) => token.value),
    ),
  ].sort();
  if (variables.length > VARIABLE_LIMIT) {
    throw new ExpressionParseError(
      `Use at most ${VARIABLE_LIMIT} distinct variables (this expression has ${variables.length}).`,
      expression.length,
    );
  }

  return { root: new Parser(tokens).parse(), variables };
}

export function evaluate(
  node: ExpressionNode,
  values: ReadonlyMap<string, boolean>,
): boolean {
  if (node.kind === "variable") return values.get(node.name) ?? false;
  if (node.kind === "not") return !evaluate(node.operand, values);

  const left = evaluate(node.left, values);
  const right = evaluate(node.right, values);
  switch (node.operator) {
    case "+":
      return left || right;
    case "*":
      return left && right;
    case "^":
      return left !== right;
  }
}

export function generateTruthTable(expression: string): TruthTable {
  const parsed = parseExpression(expression);
  const rowCount = 2 ** parsed.variables.length;
  const rows: TruthTableRow[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const values = parsed.variables.map((_, variableIndex) =>
      Boolean((rowIndex >> (parsed.variables.length - variableIndex - 1)) & 1),
    );
    const assignments = new Map(
      parsed.variables.map((variable, index) => [variable, values[index]]),
    );
    rows.push({ values, result: evaluate(parsed.root, assignments) });
  }

  return { expression, variables: parsed.variables, rows };
}

export function tableToTsv(table: TruthTable): string {
  return [
    [...table.variables, "Result"].join("\t"),
    ...table.rows.map((row) =>
      [...row.values, row.result].map(Number).join("\t"),
    ),
  ].join("\n");
}

export function tableToCsv(table: TruthTable): string {
  return [
    [...table.variables, "Result"].join(","),
    ...table.rows.map((row) =>
      [...row.values, row.result].map(Number).join(","),
    ),
  ].join("\n");
}
