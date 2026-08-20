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
  root: ExpressionNode;
  normalizedExpression: string;
  variables: string[];
  rows: TruthTableRow[];
}

export interface TreeNodeView {
  id: string;
  label: string;
  expression: string;
  kind: ExpressionNode["kind"];
  x: number;
  y: number;
}

export interface TreeEdgeView {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TreeVisualization {
  nodes: TreeNodeView[];
  edges: TreeEdgeView[];
  width: number;
  height: number;
}

export interface EvaluationStep {
  nodeId: string;
  expression: string;
  value: boolean;
  explanation: string;
}

export interface ExpressionStatistics {
  nodeCount: number;
  operatorCount: number;
  depth: number;
  classification: "Tautology" | "Contradiction" | "Contingent";
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

  return {
    expression,
    root: parsed.root,
    normalizedExpression: formatExpression(parsed.root),
    variables: parsed.variables,
    rows,
  };
}

const OPERATOR_NAMES: Record<"+" | "*" | "^", string> = {
  "+": "OR",
  "*": "AND",
  "^": "XOR",
};

export function formatExpression(node: ExpressionNode): string {
  if (node.kind === "variable") return node.name;
  if (node.kind === "not") {
    const operand = formatExpression(node.operand);
    return node.operand.kind === "variable" ? `${operand}'` : `(${operand})'`;
  }
  return `(${formatExpression(node.left)} ${node.operator} ${formatExpression(node.right)})`;
}

function getNodeLabel(node: ExpressionNode): string {
  if (node.kind === "variable") return node.name;
  if (node.kind === "not") return "NOT";
  return OPERATOR_NAMES[node.operator];
}

export function buildTreeVisualization(
  root: ExpressionNode,
): TreeVisualization {
  const nodes: TreeNodeView[] = [];
  const edges: TreeEdgeView[] = [];
  const horizontalGap = 112;
  const verticalGap = 104;
  const margin = 52;
  let nextLeaf = 0;
  let deepestLevel = 0;

  interface PositionedNode {
    id: string;
    x: number;
    y: number;
  }

  function visit(
    node: ExpressionNode,
    id: string,
    depth: number,
  ): PositionedNode {
    deepestLevel = Math.max(deepestLevel, depth);
    const children: PositionedNode[] = [];
    if (node.kind === "not") {
      children.push(visit(node.operand, `${id}-operand`, depth + 1));
    } else if (node.kind === "binary") {
      children.push(visit(node.left, `${id}-left`, depth + 1));
      children.push(visit(node.right, `${id}-right`, depth + 1));
    }

    const x = children.length
      ? children.reduce((sum, child) => sum + child.x, 0) / children.length
      : margin + nextLeaf++ * horizontalGap;
    const y = margin + depth * verticalGap;
    nodes.push({
      id,
      label: getNodeLabel(node),
      expression: formatExpression(node),
      kind: node.kind,
      x,
      y,
    });
    for (const child of children) {
      edges.push({
        from: id,
        to: child.id,
        x1: x,
        y1: y + 25,
        x2: child.x,
        y2: child.y - 25,
      });
    }
    return { id, x, y };
  }

  visit(root, "root", 0);
  const contentWidth = Math.max(
    margin * 2,
    margin * 2 + Math.max(0, nextLeaf - 1) * horizontalGap,
  );
  const width = Math.max(560, contentWidth);
  const horizontalOffset = (width - contentWidth) / 2;
  return {
    nodes: nodes.map((node) => ({ ...node, x: node.x + horizontalOffset })),
    edges: edges.map((edge) => ({
      ...edge,
      x1: edge.x1 + horizontalOffset,
      x2: edge.x2 + horizontalOffset,
    })),
    width,
    height: margin * 2 + deepestLevel * verticalGap,
  };
}

export function evaluateWithTrace(
  root: ExpressionNode,
  values: ReadonlyMap<string, boolean>,
): EvaluationStep[] {
  const steps: EvaluationStep[] = [];

  function visit(node: ExpressionNode, id: string): boolean {
    if (node.kind === "variable") {
      const value = values.get(node.name) ?? false;
      steps.push({
        nodeId: id,
        expression: node.name,
        value,
        explanation: `${node.name} = ${Number(value)}`,
      });
      return value;
    }
    if (node.kind === "not") {
      const operand = visit(node.operand, `${id}-operand`);
      const value = !operand;
      steps.push({
        nodeId: id,
        expression: formatExpression(node),
        value,
        explanation: `NOT ${Number(operand)} → ${Number(value)}`,
      });
      return value;
    }

    const left = visit(node.left, `${id}-left`);
    const right = visit(node.right, `${id}-right`);
    const value =
      node.operator === "+"
        ? left || right
        : node.operator === "*"
          ? left && right
          : left !== right;
    steps.push({
      nodeId: id,
      expression: formatExpression(node),
      value,
      explanation: `${Number(left)} ${OPERATOR_NAMES[node.operator]} ${Number(right)} → ${Number(value)}`,
    });
    return value;
  }

  visit(root, "root");
  return steps;
}

export function getExpressionStatistics(
  table: TruthTable,
): ExpressionStatistics {
  function inspect(
    node: ExpressionNode,
  ): Omit<ExpressionStatistics, "classification"> {
    if (node.kind === "variable")
      return { nodeCount: 1, operatorCount: 0, depth: 1 };
    if (node.kind === "not") {
      const child = inspect(node.operand);
      return {
        nodeCount: child.nodeCount + 1,
        operatorCount: child.operatorCount + 1,
        depth: child.depth + 1,
      };
    }
    const left = inspect(node.left);
    const right = inspect(node.right);
    return {
      nodeCount: left.nodeCount + right.nodeCount + 1,
      operatorCount: left.operatorCount + right.operatorCount + 1,
      depth: Math.max(left.depth, right.depth) + 1,
    };
  }

  const structure = inspect(table.root);
  const trueCount = table.rows.filter((row) => row.result).length;
  const classification =
    trueCount === table.rows.length
      ? "Tautology"
      : trueCount === 0
        ? "Contradiction"
        : "Contingent";
  return { ...structure, classification };
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
