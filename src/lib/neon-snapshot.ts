import { log } from "@/lib/log";

/**
 * BL-QC-auto-migrate — Neon branch snapshot helper.
 *
 * Before auto-applying migrations, snapshot the current production
 * branch so a failed apply or downstream-breaking change can be
 * rolled back by restoring the snapshot via the Neon dashboard.
 *
 * Two operating modes:
 *
 *   - **Configured**: `NEON_API_KEY` and `NEON_PROJECT_ID` are set
 *     (same env vars used by the per-PR Neon branch lifecycle).
 *     `tryCreateBranchSnapshot` calls the Neon API and returns the
 *     created branch's id. The branch acts as a point-in-time
 *     snapshot — it's a copy-on-write replica that can be restored
 *     by promoting it back to primary.
 *
 *   - **Not configured**: returns `null`. Auto-apply still runs;
 *     rollback in that case falls back on Neon's built-in
 *     point-in-time recovery (7-day window on Pro).
 *
 * One snapshot per set of pending migrations, and old ones are pruned.
 * The caller names the snapshot after the newest pending migration, so
 * a start-up that finds the same migration still pending reuses the
 * snapshot already taken instead of taking another. Until 2026-11 the
 * name carried the time of day and nothing was ever removed: every cold
 * start with a migration pending left a new branch, 820 of them by the
 * time the owner's Neon bill showed it. After a snapshot is in hand,
 * the oldest `auto-migrate-` branches beyond the newest
 * SNAPSHOTS_KEPT are deleted, a few per start-up, never the default or
 * a protected branch and never one with another name.
 */

const NEON_API_BASE = "https://console.neon.tech/api/v2";
const NEON_API_TIMEOUT_MS = 10_000;

/** Every snapshot this module takes, and only those, starts with this. */
export const SNAPSHOT_PREFIX = "auto-migrate-";
/** How many snapshots stay (the one just taken or reused among them). */
export const SNAPSHOTS_KEPT = 3;
/** Deletions per start-up: pruning must not hold up a boot. */
export const PRUNE_PER_RUN = 20;
/** More snapshots than this is worth a warning in the logs. */
const SNAPSHOT_ALERT = 10;

export type NeonBranch = { id: string; name: string; primary?: boolean; default?: boolean; protected?: boolean; created_at?: string };

/** The snapshot's name for a set of pending migrations: the newest pending file, so the same set gives the same name. */
export function snapshotNameFor(pendingFiles: readonly string[]): string {
  const newest = [...pendingFiles].sort().at(-1) ?? "pending";
  return `${SNAPSHOT_PREFIX}${newest.replace(/\.sql$/i, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 80)}`;
}

/**
 * What to do given the project's branches: reuse the snapshot of this
 * name if there is one, and which older snapshots to delete. Pure.
 */
export function planSnapshot(branches: readonly NeonBranch[], name: string): { existingId: string | null; prune: NeonBranch[]; snapshots: number } {
  const ours = branches.filter((b) => b.name.startsWith(SNAPSHOT_PREFIX) && !b.primary && !b.default && !b.protected);
  const existing = ours.find((b) => b.name === name) ?? null;
  // Newest first; the snapshot in hand always stays. A brand-new one is not in the list yet, so it takes one of the kept places.
  const others = ours
    .filter((b) => b !== existing)
    .sort((x, y) => (y.created_at ?? "").localeCompare(x.created_at ?? "") || y.name.localeCompare(x.name));
  return { existingId: existing?.id ?? null, prune: others.slice(SNAPSHOTS_KEPT - 1, SNAPSHOTS_KEPT - 1 + PRUNE_PER_RUN), snapshots: ours.length };
}

export async function tryCreateBranchSnapshot(
  name: string,
): Promise<string | null> {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  if (!apiKey || !projectId) {
    log.info("[neon-snapshot]", "skipped — neon api not configured", {
      hasApiKey: !!apiKey,
      hasProjectId: !!projectId,
    });
    return null;
  }

  // Parent branch — usually the production branch. Operator can
  // override via env if their primary branch isn't named "main".
  const parentBranchName = process.env.NEON_BRANCH_PARENT || "main";

  try {
    // First, look up the parent branch's id so we can ask Neon to
    // copy from it specifically (the API supports both name + id).
    const branchListUrl = `${NEON_API_BASE}/projects/${encodeURIComponent(projectId)}/branches`;
    const listInit = { method: "GET", headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` } };
    // Ask for every branch (a project that leaked snapshots has hundreds);
    // if the API refuses the limit, fall back to its default page.
    let listResp = await fetchWithTimeout(`${branchListUrl}?limit=10000`, listInit);
    if (!listResp.ok) listResp = await fetchWithTimeout(branchListUrl, listInit);
    if (!listResp.ok) {
      log.warn("[neon-snapshot]", "branch-list failed", {
        status: listResp.status,
        statusText: listResp.statusText,
      });
      return null;
    }
    const listJson = (await listResp.json()) as { branches?: NeonBranch[] };
    const branches = listJson.branches ?? [];
    const plan = planSnapshot(branches, name);
    if (plan.snapshots > SNAPSHOT_ALERT) {
      log.warn("[neon-snapshot]", "many migration snapshots exist; each is a billed Neon branch", { snapshots: plan.snapshots, pruningNow: plan.prune.length });
    }
    if (plan.existingId) {
      // The same migrations were pending at an earlier start-up: that snapshot stands.
      log.info("[neon-snapshot]", "reused", { snapshotId: plan.existingId, name });
      await pruneSnapshots(projectId, apiKey, plan.prune);
      return plan.existingId;
    }
    const parent =
      branches.find((b) => b.name === parentBranchName) ??
      branches.find((b) => b.primary || b.default);
    if (!parent) {
      log.warn("[neon-snapshot]", "parent branch not found", {
        looked_for: parentBranchName,
        branch_count: branches.length,
      });
      return null;
    }

    // Create the snapshot branch.
    const createUrl = `${NEON_API_BASE}/projects/${encodeURIComponent(projectId)}/branches`;
    const createResp = await fetchWithTimeout(createUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        branch: {
          name,
          parent_id: parent.id,
        },
      }),
    });
    if (!createResp.ok) {
      const errText = await createResp.text().catch(() => "");
      log.warn("[neon-snapshot]", "branch-create failed", {
        status: createResp.status,
        statusText: createResp.statusText,
        body: errText.slice(0, 500),
      });
      return null;
    }
    const createJson = (await createResp.json()) as {
      branch?: { id: string; name: string };
    };
    const snapshotId = createJson.branch?.id ?? null;
    if (snapshotId) {
      log.info("[neon-snapshot]", "created", {
        snapshotId,
        name,
        parent: parent.name,
      });
    }
    await pruneSnapshots(projectId, apiKey, plan.prune);
    return snapshotId;
  } catch (err) {
    log.warn("[neon-snapshot]", "create-snapshot failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

/** Delete old snapshots, best-effort and inside a time budget: a failure is logged and never stops the migration. */
async function pruneSnapshots(projectId: string, apiKey: string, prune: readonly NeonBranch[]): Promise<void> {
  const deadline = Date.now() + 8_000;
  let deleted = 0;
  for (const b of prune) {
    if (Date.now() > deadline) break;
    try {
      const resp = await fetchWithTimeout(`${NEON_API_BASE}/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(b.id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      });
      if (resp.ok) deleted++;
      else log.warn("[neon-snapshot]", "prune failed", { name: b.name, status: resp.status });
    } catch (err) {
      log.warn("[neon-snapshot]", "prune failed", { name: b.name, error: err instanceof Error ? err.message : "unknown" });
    }
  }
  if (deleted > 0) log.info("[neon-snapshot]", "pruned old snapshots", { deleted, asked: prune.length });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEON_API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
