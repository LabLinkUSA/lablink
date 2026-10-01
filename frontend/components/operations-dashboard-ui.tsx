import type { ReactNode } from "react";

import { DataTable, PageHeader, StatRow, StatTile } from "@/components/ui";

import styles from "./operations-dashboard-ui.module.css";

type MetricTone = "primary" | "secondary" | "tertiary";

export function OperationsHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return <PageHeader variant="operate" eyebrow={eyebrow} title={title} lead={description} actions={actions} />;
}

const METRIC_TONES = ["white", "ink", "mint"] as const;

export function OperationsMetricGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: number | string;
    note?: string;
  }>;
}) {
  return (
    <StatRow>
      {items.map((item, index) => (
        <StatTile
          key={item.label}
          tone={METRIC_TONES[index % METRIC_TONES.length]}
          value={item.value}
          label={item.label}
          sublabel={item.note}
        />
      ))}
    </StatRow>
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
  action,
  columns,
  children,
  footer,
  hideTitle = false,
}: {
  title: string;
  action?: ReactNode;
  columns: string[];
  children: ReactNode;
  footer?: ReactNode;
  hideTitle?: boolean;
}) {
  return (
    <section className={styles.tableSection}>
      {!hideTitle ? (
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {action}
        </div>
      ) : null}
      <DataTable head={columns} footer={footer}>
        {children}
      </DataTable>
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
