import { describe, expect, it } from "vitest";
import {
  ExpressionParseError,
  buildTreeVisualization,
  evaluateWithTrace,
  generateTruthTable,
  getExpressionStatistics,
  parseExpression,
  tableToCsv,
  tableToTsv,
} from "./truth-table";

describe("truth-table parser", () => {
  it("sorts variables and keeps letter case significant", () => {
    expect(parseExpression("b + A + a").variables).toEqual(["A", "a", "b"]);
  });

  it("accepts whitespace, grouping, and postfix NOT", () => {
    expect(
      generateTruthTable(" ( A + B )' ").rows.map((row) => Number(row.result)),
    ).toEqual([1, 0, 0, 0]);
  });

  it("evaluates AND and XOR at equal, left-associative precedence", () => {
    const table = generateTruthTable("A ^ B * C");
    const row = table.rows.find(
      (item) => item.values.join("") === "truetruefalse",
    );
    expect(row?.result).toBe(false);
  });

  it("evaluates AND and XOR before OR", () => {
    const table = generateTruthTable("A + B * C");
    const row = table.rows.find(
      (item) => item.values.join("") === "truefalsefalse",
    );
    expect(row?.result).toBe(true);
  });

  it("allows repeated postfix negation", () => {
    expect(generateTruthTable("A''").rows.map((row) => row.result)).toEqual([
      false,
      true,
    ]);
  });

  it.each([
    ["", "Enter a logical expression"],
    ["A B", "Expected an operator"],
    ["A +", "ends before an operand"],
    ["'A", "must follow"],
    ["()", "cannot be empty"],
    ["(A+B", "Missing a closing parenthesis"],
    ["A+B)", "no matching opening parenthesis"],
    ["A & B", "Unsupported character"],
  ])("rejects malformed expression %j", (expression, message) => {
    expect(() => parseExpression(expression)).toThrow(message);
  });

  it("includes a source position in parse errors", () => {
    try {
      parseExpression("A & B");
      throw new Error("Expected parsing to fail");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ExpressionParseError);
      expect((error as ExpressionParseError).position).toBe(2);
    }
  });

  it("enforces the ten-variable limit", () => {
    expect(generateTruthTable("A+B+C+D+E+F+G+H+I+J").rows).toHaveLength(1024);
    expect(() => parseExpression("A+B+C+D+E+F+G+H+I+J+K")).toThrow(
      "at most 10 distinct variables",
    );
  });
});

describe("truth-table output", () => {
  const table = generateTruthTable("A + B");

  it("uses conventional binary row order", () => {
    expect(table.rows.map((row) => row.values.map(Number).join(""))).toEqual([
      "00",
      "01",
      "10",
      "11",
    ]);
    expect(table.rows.map((row) => Number(row.result))).toEqual([0, 1, 1, 1]);
  });

  it("formats tab-separated clipboard output", () => {
    expect(tableToTsv(table)).toBe(
      "A\tB\tResult\n0\t0\t0\n0\t1\t1\n1\t0\t1\n1\t1\t1",
    );
  });

  it("formats CSV downloads", () => {
    expect(tableToCsv(table)).toBe("A,B,Result\n0,0,0\n0,1,1\n1,0,1\n1,1,1");
  });
});

describe("expression teaching data", () => {
  it("builds a centered tree with stable node identifiers", () => {
    const table = generateTruthTable("A * (B + C')");
    const tree = buildTreeVisualization(table.root);
    expect(tree.nodes.map((node) => node.id)).toContain(
      "root-right-right-operand",
    );
    expect(tree.nodes.find((node) => node.id === "root")?.label).toBe("AND");
    expect(tree.nodes.every((node) => node.x > 0 && node.x < tree.width)).toBe(
      true,
    );
    expect(tree.edges).toHaveLength(tree.nodes.length - 1);
  });

  it("returns post-order evaluation steps for every tree node", () => {
    const table = generateTruthTable("A + B'");
    const steps = evaluateWithTrace(
      table.root,
      new Map([
        ["A", false],
        ["B", false],
      ]),
    );
    expect(steps.map((step) => step.explanation)).toEqual([
      "A = 0",
      "B = 0",
      "NOT 0 → 1",
      "0 OR 1 → 1",
    ]);
    expect(steps.at(-1)?.nodeId).toBe("root");
  });

  it.each([
    ["A + A'", "Tautology"],
    ["A * A'", "Contradiction"],
    ["A + B", "Contingent"],
  ])("classifies %s as %s", (expression, classification) => {
    expect(
      getExpressionStatistics(generateTruthTable(expression)).classification,
    ).toBe(classification);
  });

  it("reports normalized form and structural complexity", () => {
    const table = generateTruthTable("A*(B+C')");
    expect(table.normalizedExpression).toBe("(A * (B + C'))");
    expect(getExpressionStatistics(table)).toMatchObject({
      nodeCount: 6,
      operatorCount: 3,
      depth: 4,
    });
  });
});
