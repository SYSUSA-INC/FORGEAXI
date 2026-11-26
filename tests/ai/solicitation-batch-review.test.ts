/**
 * BL-STAB-3b — the review list of a solicitation batch: what each row
 * shows, whose label wins, and when the batch may be filed. Pure.
 */
import { describe, expect, it } from "vitest";
import { basisText, chosenLabel, newFiles, reviewProblem, reviewRows, type ReviewInput } from "@/lib/solicitation-batch-review";
import { MAX_BATCH_FILES, type FileClassification, type FileLabel } from "@/lib/solicitation-file-classify";

function read(label: FileLabel, confidence = 0.9, extra: Partial<FileClassification> = {}): FileClassification {
  return { label, confidence, basis: "rules", evidence: [{ from: "name", quote: label }], amendmentNumber: "", weak: confidence < 0.6, ...extra };
}
function file(key: string, classification: FileClassification | null, choice?: ReviewInput["choice"]): ReviewInput {
  return { key, fileName: `${key}.pdf`, classification, choice };
}

describe("BL-STAB-3b — review rows", () => {
  it("shows what FORGE read, and nothing for a file not read yet", () => {
    const rows = reviewRows([file("a", read("base")), file("b", read("amendment", 0.8, { amendmentNumber: "0002" })), file("c", null)]);
    expect(rows.map((r) => r.label)).toEqual(["base", "amendment", null]);
    expect(rows[1].amendmentNumber).toBe("0002");
    expect(rows[2].suggested).toBeNull();
    expect(rows.every((r) => !r.changed)).toBe(true);
  });

  it("keeps one base among the suggestions and says why the other moved", () => {
    const rows = reviewRows([file("a", read("base", 0.7)), file("b", read("base", 0.95))]);
    expect(rows.map((r) => r.label)).toEqual(["rfp", "base"]);
    expect(rows[0].suggested?.evidence.at(-1)).toMatchObject({ from: "batch" });
    expect(rows[0].changed).toBe(false);
  });

  it("lets the person's base outrank the suggested one", () => {
    const rows = reviewRows([file("a", read("base", 0.95)), file("b", read("pws", 0.9), { label: "base" })]);
    expect(rows.map((r) => r.label)).toEqual(["rfp", "base"]);
    expect(rows[1].changed).toBe(true);
    // The row the person changed still shows what FORGE read for it.
    expect(rows[1].suggested?.label).toBe("pws");
    expect(rows[1].suggested?.confidence).toBe(0.9);
  });

  it("promotes the next base candidate when the person relabels the first", () => {
    const rows = reviewRows([file("a", read("base", 0.95), { label: "other" }), file("b", read("base", 0.7))]);
    expect(rows.map((r) => r.label)).toEqual(["other", "base"]);
  });

  it("never moves a label the person chose, even two bases", () => {
    const rows = reviewRows([file("a", read("pws"), { label: "base" }), file("b", read("sow"), { label: "base" })]);
    expect(rows.map((r) => r.label)).toEqual(["base", "base"]);
  });

  it("takes the amendment number from the person, and only for an amendment", () => {
    const [a, b, c] = reviewRows([
      file("a", read("amendment", 0.9, { amendmentNumber: "0001" }), { amendmentNumber: " 0003 " }),
      file("b", read("amendment", 0.9, { amendmentNumber: "0001" }), { label: "other" }),
      file("c", read("other"), { label: "amendment", amendmentNumber: "x".repeat(80) }),
    ]);
    expect(a.amendmentNumber).toBe("0003");
    expect(b.amendmentNumber).toBe("");
    expect(c.amendmentNumber).toHaveLength(64);
  });

  it("does not count choosing the suggested label as a change", () => {
    expect(reviewRows([file("a", read("base"), { label: "base" })])[0].changed).toBe(false);
  });
});

describe("BL-STAB-3b — picking a label", () => {
  it("does not pin a label put back to what FORGE read", () => {
    const inputs = [file("a", read("base", 0.95), { label: "other" }), file("b", read("other", 0.3))];
    expect(chosenLabel(inputs, "a", "base")).toBeUndefined();
    // So marking another file as the base still moves this one aside.
    const rows = reviewRows([file("a", read("base", 0.95), { label: chosenLabel(inputs, "a", "base") }), file("b", read("other", 0.3), { label: "base" })]);
    expect(rows.map((r) => r.label)).toEqual(["rfp", "base"]);
  });
  it("keeps a real choice, including base on a file the batch moved aside", () => {
    const inputs = [file("a", read("base", 0.7)), file("b", read("base", 0.95))];
    expect(chosenLabel(inputs, "a", "sow")).toBe("sow");
    expect(chosenLabel(inputs, "a", "base")).toBe("base");
    expect(chosenLabel(inputs, "a", "rfp")).toBeUndefined();
  });
});

describe("BL-STAB-3b — when the batch may be filed", () => {
  const ready = (label: FileLabel) => ({ label, state: "ready" as const });

  it("files one base with its companions", () => {
    expect(reviewProblem([ready("base"), ready("amendment"), ready("qa")])).toBeNull();
  });
  it("waits for uploads and reading", () => {
    expect(reviewProblem([ready("base"), { label: null, state: "uploading" }])).toMatch(/Wait/);
    expect(reviewProblem([ready("base"), { label: null, state: "reading" }])).toMatch(/Wait/);
  });
  it("asks for failed files to be retried or removed first", () => {
    expect(reviewProblem([ready("base"), { label: null, state: "upload_failed" }])).toMatch(/Retry or remove/);
    expect(reviewProblem([ready("base"), { label: null, state: "read_failed" }, { label: null, state: "uploading" }])).toMatch(/Retry or remove/);
  });
  it("passes on the batch rules: one base, the file limit, not empty", () => {
    expect(reviewProblem([])).toMatch(/No files/);
    expect(reviewProblem([ready("pws"), ready("sow")])).toMatch(/base solicitation/);
    expect(reviewProblem([ready("base"), ready("base")])).toMatch(/Only one/);
    expect(reviewProblem([ready("base"), ...Array.from({ length: MAX_BATCH_FILES }, () => ready("other"))])).toMatch(/At most/);
  });
  it("lets a partly filed batch be sent again", () => {
    expect(reviewProblem([{ label: "base", state: "filed" }, { label: "qa", state: "file_failed" }])).toBeNull();
  });
});

describe("BL-STAB-3b — wording and picked files", () => {
  it("says a label is rule-based, with its confidence", () => {
    const [row] = reviewRows([file("a", read("base", 0.824))]);
    expect(basisText(row)).toBe("Rule-based · 82% confidence");
  });
  it("names an AI check when one made the label", () => {
    const [row] = reviewRows([file("a", read("base", 0.9, { basis: "ai" }))]);
    expect(basisText(row)).toBe("AI check · 90% confidence");
  });
  it("says what FORGE read when the person chose otherwise", () => {
    const [row] = reviewRows([file("a", read("pws", 0.5), { label: "sow" })]);
    expect(basisText(row)).toBe("Chosen by you · FORGE read it as PWS (rule-based, 50%)");
  });
  it("is empty until the file is read", () => {
    expect(basisText(reviewRows([file("a", null)])[0])).toBe("");
  });
  it("drops a file picked twice", () => {
    const a = { name: "rfp.pdf", size: 10, lastModified: 1 };
    const b = { name: "rfp.pdf", size: 11, lastModified: 1 };
    expect(newFiles([a], [{ ...a }, b, { ...b }])).toEqual([b]);
  });
});
