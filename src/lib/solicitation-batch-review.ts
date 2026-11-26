import { batchProblem, settleBatch, FILE_LABEL_NAMES, type FileClassification, type FileLabel } from "./solicitation-file-classify";

/**
 * BL-STAB-3b — the review list of a solicitation batch, as pure
 * functions (the page holds the state; this decides what it shows).
 *
 * Each file has what FORGE read (`classification`, null until it is
 * read) and what the person chose on top of it (`choice`). A choice
 * always wins. Among the files nobody has touched, one base solicitation
 * is kept (`settleBatch`), and a file the person marked as the base
 * outranks every suggestion, so marking one moves the others aside
 * without a second edit.
 */

export type ReviewChoice = { label?: FileLabel; amendmentNumber?: string };

export type ReviewInput = {
  key: string;
  fileName: string;
  classification: FileClassification | null;
  choice?: ReviewChoice;
};

export type ReviewRow = {
  key: string;
  fileName: string;
  /** What will be filed (null until the file is read and nothing is chosen). */
  label: FileLabel | null;
  amendmentNumber: string;
  /** What FORGE read, after the batch was settled (null until it is read). */
  suggested: FileClassification | null;
  /** The person picked a label other than the one suggested. */
  changed: boolean;
};

/** Above any rule's confidence: a label the person chose is never moved aside. */
const CHOSEN = 2;

export function reviewRows(inputs: readonly ReviewInput[]): ReviewRow[] {
  const read = inputs.filter((f): f is ReviewInput & { classification: FileClassification } => f.classification !== null);
  const settled = settleBatch(
    read.map((f) => ({
      key: f.key,
      fileName: f.fileName,
      classification: f.choice?.label ? { ...f.classification, label: f.choice.label, confidence: CHOSEN } : f.classification,
    })),
  );
  // A suggestion keeps its own confidence and label; only the batch's
  // demotion (base → another volume) carries over from the settled set.
  const suggestions = new Map<string, FileClassification>();
  for (const s of settled) {
    const own = read.find((f) => f.key === s.key)!.classification;
    const chosen = Boolean(inputs.find((f) => f.key === s.key)?.choice?.label);
    suggestions.set(s.key, chosen ? own : s.classification);
  }
  return inputs.map((f) => {
    const suggested = suggestions.get(f.key) ?? null;
    const label = f.choice?.label ?? suggested?.label ?? null;
    return {
      key: f.key,
      fileName: f.fileName,
      label,
      amendmentNumber: label === "amendment" ? (f.choice?.amendmentNumber ?? suggested?.amendmentNumber ?? "").trim().slice(0, 64) : "",
      suggested,
      changed: Boolean(f.choice?.label && suggested && f.choice.label !== suggested.label),
    };
  });
}

/**
 * The choice to keep when the person picks `label` for one file. Picking
 * what FORGE would show for it anyway is not a choice: the row goes back
 * to following the batch, so restoring a label does not pin it.
 */
export function chosenLabel(inputs: readonly ReviewInput[], key: string, label: FileLabel): FileLabel | undefined {
  const untouched = reviewRows(inputs.map((f) => (f.key === key ? { ...f, choice: { ...f.choice, label: undefined } } : f)));
  return untouched.find((r) => r.key === key)?.label === label ? undefined : label;
}

/** Where one file of the batch stands. */
export type ReviewFileState = "uploading" | "upload_failed" | "reading" | "read_failed" | "ready" | "filed" | "file_failed";

/** Why the batch cannot be filed yet (null when it can). */
export function reviewProblem(files: readonly { label: FileLabel | null; state: ReviewFileState }[]): string | null {
  if (files.length === 0) return "No files to file.";
  if (files.some((f) => f.state === "upload_failed" || f.state === "read_failed")) return "Retry or remove the files that failed before filing the rest.";
  if (files.some((f) => f.state === "uploading" || f.state === "reading" || f.label === null)) return "Wait until every file is uploaded and read.";
  return batchProblem(files.map((f) => ({ label: f.label! })));
}

/** "Rule-based · 82%" and the like: where the label came from and how sure it is. */
export function basisText(row: Pick<ReviewRow, "suggested" | "changed" | "label">): string {
  const s = row.suggested;
  if (!s) return "";
  const pct = `${Math.round(Math.min(1, Math.max(0, s.confidence)) * 100)}%`;
  const source = s.basis === "ai" ? "AI check" : "Rule-based";
  if (row.changed) return `Chosen by you · ForgeAXI read it as ${FILE_LABEL_NAMES[s.label]} (${source.toLowerCase()}, ${pct})`;
  return `${source} · ${pct} confidence`;
}

/** Same name, size and date: the same file picked twice. */
export function fileIdentity(file: { name: string; size: number; lastModified?: number }): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified ?? 0}`;
}

/** The files of `picked` not already in `taken` (and not twice in `picked`). */
export function newFiles<T extends { name: string; size: number; lastModified?: number }>(taken: readonly T[], picked: readonly T[]): T[] {
  const seen = new Set(taken.map(fileIdentity));
  const out: T[] = [];
  for (const f of picked) {
    const id = fileIdentity(f);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(f);
  }
  return out;
}
