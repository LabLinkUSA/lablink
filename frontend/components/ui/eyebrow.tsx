import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./eyebrow.module.css";

export function Eyebrow({
  variant = "plain",
  as: Tag = "div",
  className,
  children,
}: {
  variant?: "plain" | "badge";
  as?: "div" | "span";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cx(styles.eyebrow, variant === "badge" && styles.badge, className)}>
      {variant === "badge" ? (
        <span className={styles.pulse} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.ring} />
        </span>
      ) : null}
      {children}
    </Tag>
  );
}
