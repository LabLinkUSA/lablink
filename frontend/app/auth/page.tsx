import { StatusPill } from "@/components/status-pill";

export default function AuthPage() {
  return (
    <section className="page-section">
      <div className="shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">Onboarding</span>
            <h1>Institution verification comes before marketplace access</h1>
            <p>
              Authentication and Supabase-backed account flows are planned in the backend architecture. This screen
              currently documents the v1 onboarding and trust model.
            </p>
          </div>
        </div>

        <div className="auth-grid">
          <article className="auth-card">
            <StatusPill status="pending_verification" />
            <h2>Create an account</h2>
            <p>Choose donor lab or recipient institution, attach your institution record, and submit verification materials.</p>
          </article>
          <article className="auth-card">
            <StatusPill status="verified" />
            <h2>Admin review</h2>
            <p>Admins can approve, reject, suspend, or reactivate institutions before they can post listings or submit requests.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
