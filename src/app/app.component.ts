import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  signal,
} from "@angular/core";
import { ReactiveFormsModule, FormControl, Validators } from "@angular/forms";
import {
  ExpressionParseError,
  TruthTable,
  buildTreeVisualization,
  evaluateWithTrace,
  generateTruthTable,
  getExpressionStatistics,
  tableToCsv,
  tableToTsv,
} from "./truth-table";

@Component({
  selector: "app-root",
  imports: [ReactiveFormsModule],
  templateUrl: "./app.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly expression = new FormControl("A * (B + C')", {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly examples = [
    { label: "OR", expression: "A + B" },
    { label: "AND with NOT", expression: "A * B'" },
    { label: "Grouped XOR", expression: "(A + B') ^ C" },
  ];
  readonly table = signal<TruthTable | null>(null);
  readonly error = signal<string | null>(null);
  readonly copyStatus = signal<string | null>(null);
  readonly selectedRowIndex = signal(0);
  readonly selectedNodeId = signal("root");
  readonly tree = computed(() => {
    const table = this.table();
    return table ? buildTreeVisualization(table.root) : null;
  });
  readonly statistics = computed(() => {
    const table = this.table();
    return table ? getExpressionStatistics(table) : null;
  });
  readonly selectedRow = computed(() => {
    const table = this.table();
    return table?.rows[this.selectedRowIndex()] ?? null;
  });
  readonly evaluationSteps = computed(() => {
    const table = this.table();
    const row = this.selectedRow();
    if (!table || !row) return [];
    const values = new Map(
      table.variables.map((variable, index) => [variable, row.values[index]]),
    );
    return evaluateWithTrace(table.root, values);
  });
  readonly evaluationByNode = computed(
    () => new Map(this.evaluationSteps().map((step) => [step.nodeId, step])),
  );
  readonly selectedNode = computed(() =>
    this.tree()?.nodes.find((node) => node.id === this.selectedNodeId()),
  );

  constructor() {
    const sharedExpression = new URL(window.location.href).searchParams.get(
      "expression",
    );
    if (sharedExpression) this.expression.setValue(sharedExpression);
    this.generate(false);
  }

  @HostListener("window:popstate")
  loadSharedExpression(): void {
    const expression = new URL(window.location.href).searchParams.get(
      "expression",
    );
    if (!expression) return;
    this.expression.setValue(expression);
    this.generate(false);
  }

  generate(updateUrl = true): void {
    this.copyStatus.set(null);
    try {
      this.table.set(generateTruthTable(this.expression.value));
      this.error.set(null);
      this.selectedRowIndex.set(0);
      this.selectedNodeId.set("root");
      if (updateUrl) this.updateExpressionUrl();
    } catch (error: unknown) {
      this.table.set(null);
      if (error instanceof ExpressionParseError) {
        this.error.set(`${error.message} Position ${error.position + 1}.`);
      } else {
        this.error.set(
          "The truth table could not be generated. Please check the expression.",
        );
      }
    }
  }

  useExample(expression: string): void {
    this.expression.setValue(expression);
    this.generate();
  }

  selectRow(index: number): void {
    this.selectedRowIndex.set(index);
    this.selectedNodeId.set("root");
  }

  nodeValue(nodeId: string): boolean | null {
    return this.evaluationByNode().get(nodeId)?.value ?? null;
  }

  async copyShareLink(): Promise<void> {
    this.updateExpressionUrl();
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.copyStatus.set("Share link copied to the clipboard.");
    } catch {
      this.copyStatus.set(
        "Clipboard access was unavailable. Copy the address from your browser instead.",
      );
    }
  }

  async copyTable(): Promise<void> {
    const table = this.table();
    if (!table) return;

    try {
      await navigator.clipboard.writeText(tableToTsv(table));
      this.copyStatus.set("Table copied to the clipboard.");
    } catch {
      this.copyStatus.set(
        "Clipboard access was unavailable. Try downloading the CSV instead.",
      );
    }
  }

  downloadCsv(): void {
    const table = this.table();
    if (!table) return;

    const blob = new Blob([tableToCsv(table)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "truth-table.csv";
    link.click();
    URL.revokeObjectURL(url);
    this.copyStatus.set("CSV download started.");
  }

  private updateExpressionUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.set("expression", this.expression.value.trim());
    window.history.replaceState(null, "", url);
  }
}
