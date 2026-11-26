"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { UploadQueue } from "@/components/uploads/UploadQueue";
import { useUploadQueue } from "@/components/uploads/useUploadQueue";
import type { ClassifiedUpload } from "@/lib/solicitation-batch";
import { basisText, chosenLabel, newFiles, reviewProblem, reviewRows, type ReviewChoice, type ReviewFileState, type ReviewInput } from "@/lib/solicitation-batch-review";
import { FILE_LABELS, FILE_LABEL_NAMES, MAX_BATCH_FILES, isFileLabel, type LabelEvidence } from "@/lib/solicitation-file-classify";
import { formatBytes } from "@/lib/upload-client-logic";
import { acceptFor } from "@/lib/upload-policy";
import { classifyUploadedFileAction, fileSolicitationBatchAction } from "../batch-actions";

type Read = { uploadId: string } & ({ status: "reading" } | { status: "read"; file: ClassifiedUpload } | { status: "failed"; error: string });
type Outcome = { solicitationId: string | null; filed: string[]; failed: Record<string, string>; error: string | null };

const NO_ANSWER = "ForgeAXI didn't answer (it may have timed out).";
const EVIDENCE_FROM: Record<LabelEvidence["from"], string> = { name: "File name", text: "In the text", batch: "In this batch" };
const STATE_TEXT: Partial<Record<ReviewFileState, string>> = { reading: "Reading…", file_failed: "Not filed" };

/**
 * BL-STAB-3b — several files dropped on New Solicitation. Each goes
 * straight to storage, FORGE reads it and suggests what it is (with the
 * lines it went by), and the person checks every label. Nothing is filed
 * until they press the button; then the base solicitation is filed, the
 * amendments under it and the rest as its documents.
 */
export function SolicitationBatchReview({ initialFiles, maxBytes, then, onStartOver }: { initialFiles: File[]; maxBytes: number; then: "solicitation" | "create"; onStartOver: () => void }) {
  const router = useRouter();
  const queue = useUploadQueue({ purpose: "document", maxBytes });
  const [reads, setReads] = useState<Record<string, Read>>({});
  const [choices, setChoices] = useState<Record<string, ReviewChoice>>({});
  const [filing, setFiling] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ solicitationId: null, filed: [], failed: {}, error: null });
  const started = useRef(new Map<string, string>());
  const seeded = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { add } = queue;
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    add(initialFiles.map((file) => ({ file, meta: undefined })));
    // The files picked when the review opened: added once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const read = useCallback(async (itemId: string, uploadId: string) => {
    started.current.set(itemId, uploadId);
    setReads((r) => ({ ...r, [itemId]: { uploadId, status: "reading" } }));
    let next: Read;
    try {
      const res = await classifyUploadedFileAction({ uploadId });
      next = res.ok ? { uploadId, status: "read", file: res.file } : { uploadId, status: "failed", error: res.error };
    } catch {
      next = { uploadId, status: "failed", error: `${NO_ANSWER} Read it again.` };
    }
    // A retried upload has a new id: an answer about the old one is dropped.
    if (started.current.get(itemId) === uploadId) setReads((r) => ({ ...r, [itemId]: next }));
  }, []);

  // Read each file as soon as it is in storage and checked.
  useEffect(() => {
    for (const it of queue.items) {
      if (it.phase === "done" && it.uploadId && started.current.get(it.id) !== it.uploadId) void read(it.id, it.uploadId);
    }
  }, [queue.items, read]);

  const inputs = useMemo<ReviewInput[]>(
    () =>
      queue.items.map((it) => {
        const r = reads[it.id];
        return { key: it.id, fileName: it.file.name, classification: r?.status === "read" && r.uploadId === it.uploadId ? r.file : null, choice: choices[it.id] };
      }),
    [queue.items, reads, choices],
  );
  const rows = useMemo(() => reviewRows(inputs), [inputs]);

  const files = queue.items.map((it, i) => {
    const r = reads[it.id];
    const state: ReviewFileState =
      it.phase === "failed" || it.phase === "cancelled"
        ? "upload_failed"
        : it.phase !== "done" || !it.uploadId
          ? "uploading"
          : outcome.filed.includes(it.uploadId)
            ? "filed"
            : outcome.failed[it.uploadId]
              ? "file_failed"
              : !r || r.status === "reading" || r.uploadId !== it.uploadId
                ? "reading"
                : r.status === "failed"
                  ? "read_failed"
                  : "ready";
    return { item: it, row: rows[i], state, read: r };
  });
  const inStorage = files.filter((f) => f.state !== "uploading" && f.state !== "upload_failed");
  const problem = reviewProblem(files.map((f) => ({ label: f.row.label, state: f.state })));
  const partlyFiled = outcome.solicitationId !== null;
  const notFiled = files.filter((f) => f.state !== "filed").length;
  const where = (id: string) => (then === "create" ? `/pipeline/identify?tab=create&from=${id}` : `/solicitations/${id}`);
  const destination = outcome.solicitationId ? where(outcome.solicitationId) : null;

  function choose(itemId: string, change: ReviewChoice) {
    setChoices((c) => ({ ...c, [itemId]: { ...c[itemId], ...change } }));
  }

  function addFiles(list: FileList | null | undefined) {
    const picked = newFiles(
      queue.items.map((it) => it.file),
      Array.from(list ?? []),
    );
    if (picked.length > 0) queue.add(picked.map((file) => ({ file, meta: undefined })));
  }

  function startOver() {
    // Files in storage that were never filed are deleted with their row.
    for (const f of files) if (f.state !== "filed") queue.remove(f.item.id);
    onStartOver();
  }

  async function fileAll() {
    if (problem || filing) return;
    setFiling(true);
    setOutcome((o) => ({ ...o, error: null }));
    try {
      const res = await fileSolicitationBatchAction({
        files: files.map((f) => ({ uploadId: f.item.uploadId!, label: f.row.label!, amendmentNumber: f.row.amendmentNumber })),
      });
      if (!res.ok) {
        setOutcome((o) => ({ ...o, error: res.error }));
      } else {
        setOutcome({ solicitationId: res.solicitationId, filed: res.filed.map((x) => x.uploadId), failed: Object.fromEntries(res.failed.map((x) => [x.uploadId, x.error])), error: null });
        if (res.failed.length === 0) {
          // Stay locked while the next page loads.
          router.push(where(res.solicitationId));
          return;
        }
      }
    } catch {
      setOutcome((o) => ({ ...o, error: `${NO_ANSWER} File them again: a file already filed is not filed twice.` }));
    }
    setFiling(false);
  }

  const failedCount = Object.keys(outcome.failed).length;
  return (
    <Panel
      title={`Review ${queue.items.length} file${queue.items.length === 1 ? "" : "s"}`}
      eyebrow="Check each label · nothing is filed until you confirm"
      actions={
        <button type="button" className="aur-btn aur-btn-ghost" disabled={filing} onClick={startOver}>
          {partlyFiled ? "Close" : "Start over"}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="font-body text-[12px] text-muted">
          ForgeAXI read each file and suggests what it is, with the lines it went by. Change any label that is wrong. One file is the base solicitation; amendments are filed under it in number order, and the rest
          become its documents.
        </p>

        <UploadQueue items={queue.items.filter((it) => it.phase !== "done")} onRetry={queue.retry} onCancel={queue.cancel} onRemove={queue.remove} />

        {inStorage.length > 0 ? (
          <ul className="flex flex-col">
            {inStorage.map(({ item, row, state, read: r }) => {
              const failure = state === "file_failed" ? outcome.failed[item.uploadId!] : r?.status === "failed" ? r.error : null;
              const note = r?.status === "read" ? r.file.note : "";
              const locked = filing || state === "filed";
              return (
                <li key={item.id} className={`grid items-start gap-x-4 gap-y-2 border-t py-3 sm:grid-cols-[minmax(0,1fr)_15rem_auto] ${failure ? "border-rose/40" : "border-layer/10"}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="min-w-0 truncate font-mono text-[12px] text-text" title={item.file.name}>
                        {item.file.name}
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        {formatBytes(item.file.size)}
                        {STATE_TEXT[state] ? ` · ${STATE_TEXT[state]}` : ""}
                      </span>
                      {state === "filed" ? <span className="font-mono text-[10px] uppercase tracking-label text-green">Filed</span> : null}
                      {state === "ready" && row.suggested?.weak && !row.changed ? (
                        <span className="rounded border border-brass/40 bg-brass/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-brass">Not sure · check this one</span>
                      ) : null}
                    </div>
                    {row.suggested ? <div className="mt-1 font-mono text-[11px] text-muted">{basisText(row)}</div> : null}
                    {row.suggested && row.suggested.evidence.length > 0 ? (
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {row.suggested.evidence.map((e, i) => (
                          <li key={i} className="font-body text-[12px] text-muted">
                            <span className="font-mono text-[10px] uppercase tracking-label text-subtle">{EVIDENCE_FROM[e.from]}</span> <span className="text-text">{e.quote}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {note ? <div className="mt-1 font-body text-[12px] text-muted">{note}</div> : null}
                    {failure ? <p className="mt-1 font-mono text-[11px] text-rose">{failure}</p> : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    {row.label ? (
                      <select
                        aria-label={`What ${item.file.name} is`}
                        className="aur-input text-[12px]"
                        value={row.label}
                        disabled={locked}
                        onChange={(e) => {
                          if (isFileLabel(e.target.value)) choose(item.id, { label: chosenLabel(inputs, item.id, e.target.value) });
                        }}
                      >
                        {FILE_LABELS.map((l) => (
                          <option key={l} value={l}>
                            {FILE_LABEL_NAMES[l]}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {row.label === "amendment" ? (
                      <input
                        type="text"
                        aria-label={`Amendment number for ${item.file.name}`}
                        placeholder='Amendment # ("0001")'
                        className="aur-input text-[12px]"
                        maxLength={64}
                        value={choices[item.id]?.amendmentNumber ?? row.suggested?.amendmentNumber ?? ""}
                        disabled={locked}
                        onChange={(e) => choose(item.id, { amendmentNumber: e.target.value })}
                      />
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    {state === "read_failed" ? (
                      <button type="button" className="aur-btn aur-btn-ghost" onClick={() => void read(item.id, item.uploadId!)}>
                        Read again
                      </button>
                    ) : null}
                    {state !== "filed" ? (
                      <button type="button" className="aur-btn aur-btn-ghost" disabled={filing} onClick={() => queue.remove(item.id)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {outcome.error ? <div className="rounded-md border border-rose/40 bg-rose/10 px-3 py-2 font-mono text-[11px] text-rose">{outcome.error}</div> : null}
        {partlyFiled && failedCount > 0 ? (
          <div className="rounded-md border border-brass/40 bg-brass/10 px-3 py-2 font-body text-[12px] text-text">
            The solicitation is filed, but {failedCount === 1 ? "one file was" : `${failedCount} files were`} not. Retry them here (a file already filed is not filed twice), or remove them and add them later from the
            solicitation&rsquo;s page.
          </div>
        ) : null}
        {problem && !filing ? <div className="font-mono text-[11px] text-muted">{problem}</div> : null}

        <div className="flex flex-wrap items-center gap-2">
          {notFiled > 0 ? (
            <button type="button" className="aur-btn aur-btn-primary disabled:opacity-50" disabled={Boolean(problem) || filing} onClick={() => void fileAll()}>
              {filing ? "Filing…" : partlyFiled ? `Retry ${notFiled} file${notFiled === 1 ? "" : "s"}` : `File ${files.length} file${files.length === 1 ? "" : "s"}`}
            </button>
          ) : null}
          {destination && !filing ? (
            <button type="button" className={`aur-btn ${notFiled > 0 ? "aur-btn-ghost" : "aur-btn-primary"}`} onClick={() => router.push(destination)}>
              {notFiled > 0 ? "Continue without them" : "Continue"}
            </button>
          ) : null}
          {!partlyFiled ? (
            <>
              <button type="button" className="aur-btn aur-btn-ghost" disabled={filing || queue.items.length >= MAX_BATCH_FILES} onClick={() => inputRef.current?.click()}>
                Add files
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={acceptFor("document")}
                className="sr-only"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </>
          ) : null}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-label text-subtle">
          Up to {MAX_BATCH_FILES} files · labels here are rule-based (file name and text) · each file is parsed on its own after filing
        </div>
      </div>
    </Panel>
  );
}
