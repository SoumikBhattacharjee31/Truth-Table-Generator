import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { ReactiveFormsModule, FormControl, Validators } from "@angular/forms";
import {
  ExpressionParseError,
  TruthTable,
  generateTruthTable,
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

  constructor() {
    this.generate();
  }

  generate(): void {
    this.copyStatus.set(null);
    try {
      this.table.set(generateTruthTable(this.expression.value));
      this.error.set(null);
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
}
