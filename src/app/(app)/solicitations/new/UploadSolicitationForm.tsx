"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { UploadQueue } from "@/components/uploads/UploadQueue";
import { useUploadQueue } from "@/components/uploads/useUploadQueue";
import { acceptFor, formatLimit } from "@/lib/upload-policy";
import { createSolicitationFromUploadAction } from "../actions";
import { SolicitationBatchReview } from "./SolicitationBatchReview";

/**
 * BL-STAB-2c — the file goes from the browser straight to storage (no
 * request-size cap), the server checks it, and it is filed as a new
 * solicitation whose parse then runs in the background.
 *
 * BL-STAB-3b — several files at once (not on an opportunity) open the
 * batch review instead: each is labelled, the person confirms, and the
 * set is filed as one solicitation with its amendments and documents.
 */
export function UploadSolicitationForm({ maxBytes, then = "solicitation", opportunityId }: { maxBytes: number; /** BL-NAV-LIFECYCLE 1a — "create": go on to Identify → Create with the document; BL-SCOUT-FILES — "opportunity": file it on `opportunityId` and stay. */ then?: "solicitation" | "create" | "opportunity"; opportunityId?: string }) {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const filed = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [batch, setBatch] = useState<File[] | null>(null);
  // Filing on an opportunity takes several documents at once; creating a
  // solicitation takes the one file that becomes it.
  const many = then === "opportunity";
  const queue = useUploadQueue<string>({
    purpose: "document",
    concurrency: 1,
    maxBytes,
    claim: async ({ uploadId }) => {
      const res = await createSolicitationFromUploadAction({ uploadId, opportunityId: then === "opportunity" ? opportunityId : null });
      return res.ok ? { ok: true, result: res.id } : { ok: false, error: res.error };
    },
    onItemDone: (item) => {
      if (item.phase === "done" && item.result) {
        if (then === "opportunity") {
          filed.current += 1;
          setNotice(
            filed.current === 1
              ? "Filed on this opportunity. FORGE is reading it now; it shows above."
              : `Filed ${filed.current} documents on this opportunity. FORGE is reading them now; they show above.`,
          );
          router.refresh();
          return;
        }
        router.push(then === "create" ? `/pipeline/identify?tab=create&from=${item.result}` : `/solicitations/${item.result}`);
      }
    },
  });
  const limit = formatLimit(maxBytes);

  function take(files: FileList | null | undefined) {
    const picked = Array.from(files ?? []);
    const file = picked[0];
    if (!file) return;
    if (many) {
      // On an opportunity every file dropped is filed on it, one after another.
      setNotice(null);
      queue.add(picked.map((f) => ({ file: f, meta: undefined })));
      return;
    }
    if (queue.busy) {
      setNotice("One upload at a time here: wait for this one to finish.");
      return;
    }
    setNotice(null);
    queue.clear();
    if (picked.length > 1) {
      // BL-STAB-3b — several files: label each, confirm, then file them together.
      setBatch(picked);
      return;
    }
    queue.add([{ file, meta: undefined }]);
  }
  function browse() {
    if (many || !queue.busy) inputRef.current?.click();
  }

  if (batch && then !== "opportunity") {
    return <SolicitationBatchReview initialFiles={batch} maxBytes={maxBytes} then={then} onStartOver={() => setBatch(null)} />;
  }

  return (
    <Panel title="Upload" eyebrow={`PDF · DOCX · XLSX · PPTX · TXT · CSV · Image · up to ${limit}`}>
      <div className="flex flex-col gap-3">
        <div
          onClick={browse}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            take(e.dataTransfer.files);
          }}
          className={`relative grid cursor-pointer place-items-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            dragOver ? "border-teal/70 bg-teal/[0.06]" : "border-layer/15 bg-layer/[0.02] hover:border-layer/30"
          }`}
        >
          <div className="font-display text-2xl font-semibold text-text">{queue.busy ? "Uploading…" : many ? "Drop files here" : "Drop one file or several here"}</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-label text-muted">or click to browse</div>
          <button
            type="button"
            disabled={!many && queue.busy}
            onClick={(e) => {
              e.stopPropagation();
              browse();
            }}
            className="aur-btn aur-btn-primary mt-4 disabled:opacity-50"
          >
            Select files
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={acceptFor("document")}
            className="sr-only"
            onChange={(e) => {
              take(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {notice ? <div className="rounded-md border border-layer/15 bg-layer/[0.04] px-3 py-2 font-mono text-[11px] text-muted">{notice}</div> : null}

        <UploadQueue items={queue.items} onRetry={queue.retry} onCancel={queue.cancel} onRemove={queue.remove} />

        <div className="font-mono text-[10px] uppercase tracking-label text-subtle">
          {many ? "Each file goes" : "The file goes"} straight to secure storage, then text extraction and the AI parse run in the background.
          {many ? "" : " Several files at once: FORGE labels each one (solicitation, amendment, Q&A, attachment, pricing sheet, form) and you confirm before anything is filed."}
        </div>
      </div>
    </Panel>
  );
}
