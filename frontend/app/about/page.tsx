export default function AboutPage() {
  return (
    <section className="page-section">
      <div className="shell two-column-grid">
        <article className="callout">
          <span className="eyebrow">Why LabLink exists</span>
          <h1>Equipment reuse is valuable only when the handoff is trustworthy.</h1>
          <p>
            LabLink is designed for scientific and clinical equipment that often requires storage readiness, training,
            special handling, or institutional authority. That is why v1 is a managed marketplace instead of a direct
            checkout flow.
          </p>
        </article>
        <article className="callout">
          <span className="eyebrow">What v1 avoids</span>
          <h2>Deliberate non-goals</h2>
          <p>No buyer-to-seller checkout, no volunteer courier network, and no open-ended direct messages outside request workflows.</p>
        </article>
      </div>
    </section>
  );
}

