import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./page-header.module.css";

export function PageHeader({
  variant,
  eyebrow,
  title,
  lead,
  actions,
}: {
  variant: "public" | "operate";
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={cx(styles.header, styles[variant])}>
      <div className={styles.copy}>
        {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
        <h1 className={styles.title}>{title}</h1>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
