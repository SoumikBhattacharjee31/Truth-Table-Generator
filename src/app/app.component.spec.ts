import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppComponent } from "./app.component";

describe("AppComponent", () => {
  beforeEach(async () => {
    window.history.replaceState(null, "", "/");
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it("renders the initial example and its table", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector("h1")?.textContent).toContain(
      "complete truth table",
    );
    expect(element.querySelectorAll("tbody tr")).toHaveLength(8);
    expect(element.querySelector(".result-summary")?.textContent).toContain(
      "3 variables",
    );
  });

  it("generates a table when the form is submitted", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.expression.setValue("A + B");
    fixture.debugElement
      .query(By.css("form"))
      .triggerEventHandler("submit", new Event("submit"));
    fixture.detectChanges();
    expect(fixture.componentInstance.table()?.rows).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll("tbody tr")).toHaveLength(4);
  });

  it("shows a parse error and removes stale results", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.expression.setValue("A +");
    fixture.componentInstance.generate();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(".error-message")?.textContent,
    ).toContain("ends before an operand");
    expect(fixture.nativeElement.querySelector("table")).toBeNull();
  });

  it("loads an example and regenerates immediately", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.useExample("A * B'");
    expect(fixture.componentInstance.expression.value).toBe("A * B'");
    expect(
      fixture.componentInstance.table()?.rows.map((row) => Number(row.result)),
    ).toEqual([0, 0, 1, 0]);
  });

  it("copies the table as TSV", async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await fixture.componentInstance.copyTable();
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain("A\tB\tC\tResult");
    expect(fixture.componentInstance.copyStatus()).toContain("copied");
  });

  it("selects a row and updates its evaluation", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.expression.setValue("A + B");
    fixture.componentInstance.generate();
    fixture.componentInstance.selectRow(1);

    expect(fixture.componentInstance.selectedRow()?.values).toEqual([
      false,
      true,
    ]);
    expect(fixture.componentInstance.evaluationSteps().at(-1)?.value).toBe(
      true,
    );
  });

  it("loads and writes shareable expression URLs", () => {
    window.history.replaceState(null, "", "/?expression=A%2BB");
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.expression.value).toBe("A+B");

    fixture.componentInstance.expression.setValue("A * B");
    fixture.componentInstance.generate();
    expect(new URL(window.location.href).searchParams.get("expression")).toBe(
      "A * B",
    );
  });
});
