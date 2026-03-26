import type { ReactNode } from "react";

type MetricTone = "primary" | "secondary" | "tertiary";

export function OperationsHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ops-header">
      <div className="ops-header-copy">
        {eyebrow ? <span className="ops-header-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="ops-header-actions">{actions}</div> : null}
    </header>
  );
}

export function OperationsMetricGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: number | string;
    tone: MetricTone;
    icon: string;
    note?: string;
  }>;
}) {
  return (
    <section className="ops-metric-grid">
      {items.map((item) => (
        <article key={item.label} className={`ops-metric-card ops-metric-card-${item.tone}`}>
          <div className="ops-metric-topline">
            <span className="ops-metric-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.note ? <span className="ops-metric-note">{item.note}</span> : null}
          </div>
          <div className="ops-metric-copy">
            <h3>{item.label}</h3>
            <strong>{item.value}</strong>
          </div>
        </article>
      ))}
    </section>
  );
}

export function OperationsLayout({
  main,
  side,
}: {
  main: ReactNode;
  side: ReactNode;
}) {
  return <div className="ops-layout">{main}{side}</div>;
}

export function OperationsTableSection({
  title,
  tone,
  action,
  columns,
  children,
  footer,
  hideTitle = false,
}: {
  title: string;
  tone: MetricTone;
  action?: ReactNode;
  columns: string[];
  children: ReactNode;
  footer?: ReactNode;
  hideTitle?: boolean;
}) {
  return (
    <section className="ops-section">
      {!hideTitle ? (
        <div className="ops-section-head">
          <h2>
            <span className={`ops-section-accent ops-section-accent-${tone}`} />
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      <div className="ops-table-shell">
        <table className="ops-table">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={column} className={index === columns.length - 1 ? "ops-table-align-right" : undefined}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
        {footer ? <div className="ops-table-footer">{footer}</div> : null}
      </div>
    </section>
  );
}

export function OperationsFeedSection({
  title,
  tone,
  action,
  children,
  alert,
}: {
  title: string;
  tone: MetricTone;
  action?: ReactNode;
  children: ReactNode;
  alert?: ReactNode;
}) {
  return (
    <section className="ops-section ops-feed-section">
      <div className="ops-section-head">
        <h2>
          <span className={`ops-section-accent ops-section-accent-${tone}`} />
          {title}
        </h2>
        {action}
      </div>
      <div className="ops-feed-list">{children}</div>
      {alert ? <div className="ops-feed-alert">{alert}</div> : null}
    </section>
  );
}

export function OperationsEmptyState({ message }: { message: string }) {
  return <div className="ops-empty-state">{message}</div>;
}
