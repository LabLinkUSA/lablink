import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./empty-state.module.css";

export function EmptyState({
  variant,
  eyebrow,
  title,
  lead,
  icon,
  actions,
  children,
}: {
  variant: "gate" | "empty";
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={cx(styles.state, styles[variant])}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
      <h2 className={styles.title}>{title}</h2>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
      {children}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}
