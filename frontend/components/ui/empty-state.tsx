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
  headingLevel = 2,
}: {
  variant: "gate" | "empty";
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className={cx(styles.state, styles[variant])} data-gate={variant === "gate" ? "" : undefined}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
      <Heading className={styles.title}>{title}</Heading>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
      {children}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}
