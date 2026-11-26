import { loadPartnerMatrixAction } from "./actions";
import { PartnerMatrixClient } from "./PartnerMatrixClient";
import { Logo } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";

/**
 * BL-NAV-LIFECYCLE phase 3c — a partner's own matrix page, outside the
 * app shell: the questions only, never the inviter's answers, with Yes /
 * Partial % / No and evidence, and the partner's certifications.
 */
export default async function PartnerMatrixPage({ params }: { params: { token: string } }) {
  const res = await loadPartnerMatrixAction(params.token);
  return (
    <main className="min-h-screen bg-canvas text-text">
      <div className="mx-auto max-w-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Logo height={34} priority />
          <div className="font-mono text-[10px] uppercase tracking-label text-muted">Capability questions</div>
        </div>
        {res.ok ? (
          <PartnerMatrixClient token={params.token} view={res.view} />
        ) : (
          <div className="mt-8 rounded-xl border border-red/30 bg-red/5 p-6">
            <div className="font-display text-xl font-semibold text-red">This link can&rsquo;t be opened</div>
            <p className="mt-2 font-mono text-[12px] text-muted">{res.error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
