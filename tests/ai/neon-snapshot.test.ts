/**
 * BL-QC-auto-migrate — the pre-migration Neon snapshot is taken once per
 * set of pending migrations and old snapshots are pruned. Until 2026-11
 * every cold start with a migration pending left a new, billed branch
 * (820 of them on the owner's project). The Neon API is stubbed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRUNE_PER_RUN, SNAPSHOTS_KEPT, planSnapshot, snapshotNameFor, tryCreateBranchSnapshot, type NeonBranch } from "@/lib/neon-snapshot";

const main: NeonBranch = { id: "br-main", name: "main", default: true, created_at: "2026-04-20T15:42:37Z" };
const old = (n: number): NeonBranch => ({ id: `br-old-${n}`, name: `auto-migrate-2026-09-${String(n).padStart(2, "0")}t10-00-00`, created_at: `2026-09-${String(n).padStart(2, "0")}T10:00:00Z` });

describe("neon snapshot — naming and planning (pure)", () => {
  it("names the snapshot after the newest pending migration, so the same set gives the same name", () => {
    expect(snapshotNameFor(["0181_solicitation_batch_types.sql", "0180_submission_reply.sql"])).toBe("auto-migrate-0181_solicitation_batch_types");
    expect(snapshotNameFor(["0181_solicitation_batch_types.sql"])).toBe(snapshotNameFor(["0180_submission_reply.sql", "0181_solicitation_batch_types.sql"]));
    expect(snapshotNameFor([])).toBe("auto-migrate-pending");
  });

  it("reuses a snapshot of the same name and prunes the oldest beyond the kept ones", () => {
    const name = "auto-migrate-0181_solicitation_batch_types";
    const branches = [main, ...Array.from({ length: 9 }, (_, i) => old(i + 1)), { id: "br-now", name, created_at: "2026-11-26T20:00:00Z" }];
    const plan = planSnapshot(branches, name);
    expect(plan.existingId).toBe("br-now");
    expect(plan.snapshots).toBe(10);
    // The one in hand and the two newest others stay; the seven oldest go.
    expect(plan.prune.map((b) => b.id)).toEqual([7, 6, 5, 4, 3, 2, 1].map((n) => `br-old-${n}`));
    expect(SNAPSHOTS_KEPT).toBe(3);
  });

  it("never plans to delete the default, a protected branch or a branch with another name, and caps one run", () => {
    const branches: NeonBranch[] = [
      main,
      { id: "br-preview", name: "preview", created_at: "2026-11-01T00:00:00Z" },
      { id: "br-pr", name: "pr-515", created_at: "2026-11-21T00:00:00Z" },
      { id: "br-kept", name: "auto-migrate-keep-me", protected: true, created_at: "2026-01-01T00:00:00Z" },
      { id: "br-odd", name: "auto-migrate-is-primary", primary: true, created_at: "2026-01-01T00:00:00Z" },
      ...Array.from({ length: 60 }, (_, i) => ({ id: `br-${i}`, name: `auto-migrate-x-${String(i).padStart(2, "0")}`, created_at: `2026-10-01T00:${String(i).padStart(2, "0")}:00Z` })),
    ];
    const plan = planSnapshot(branches, "auto-migrate-new");
    expect(plan.existingId).toBeNull();
    expect(plan.prune).toHaveLength(PRUNE_PER_RUN);
    expect(plan.prune.every((b) => /^br-\d+$/.test(b.id))).toBe(true);
    // The newest two of the sixty stay beside the snapshot about to be taken.
    expect(plan.prune.map((b) => b.id)).not.toContain("br-59");
    expect(plan.prune.map((b) => b.id)).not.toContain("br-58");
    expect(plan.prune[0]!.id).toBe("br-57");
  });
});

describe("neon snapshot — against a stubbed Neon API", () => {
  let calls: { method: string; url: string; body?: string }[];
  let branches: NeonBranch[];

  beforeEach(() => {
    calls = [];
    branches = [main, ...Array.from({ length: 5 }, (_, i) => old(i + 1))];
    vi.stubEnv("NEON_API_KEY", "test-key");
    vi.stubEnv("NEON_PROJECT_ID", "test-project");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        const method = init.method ?? "GET";
        calls.push({ method, url, body: typeof init.body === "string" ? init.body : undefined });
        if (method === "GET") return new Response(JSON.stringify({ branches }), { status: 200 });
        if (method === "POST") {
          const name = JSON.parse(String(init.body)).branch.name as string;
          const created = { id: `br-new-${branches.length}`, name, created_at: "2026-11-26T20:00:00Z" };
          branches.push(created);
          return new Response(JSON.stringify({ branch: created }), { status: 201 });
        }
        branches = branches.filter((b) => !url.endsWith(`/branches/${b.id}`));
        return new Response("{}", { status: 200 });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("takes one snapshot for a set of migrations however often it is asked, and prunes the old ones", async () => {
    const name = snapshotNameFor(["0181_solicitation_batch_types.sql"]);
    const first = await tryCreateBranchSnapshot(name);
    expect(first).toBeTruthy();
    // Three more cold starts with the same migration still pending.
    for (let i = 0; i < 3; i++) expect(await tryCreateBranchSnapshot(name)).toBe(first);

    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    const left = branches.map((b) => b.name);
    expect(left).toContain("main");
    expect(left.filter((n) => n.startsWith("auto-migrate-"))).toHaveLength(SNAPSHOTS_KEPT);
    expect(left).toContain(name);
    // Only snapshot branches were ever deleted.
    expect(calls.filter((c) => c.method === "DELETE").every((c) => /br-old-\d+$/.test(c.url))).toBe(true);
  });

  it("does nothing without the Neon settings", async () => {
    vi.stubEnv("NEON_API_KEY", "");
    expect(await tryCreateBranchSnapshot("auto-migrate-x")).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
