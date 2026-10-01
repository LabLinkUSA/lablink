"use client";

import { cx } from "./cx";
import styles from "./highlight.module.css";
import { useInView } from "./reveal";

export function Highlight({ children }: { children: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.5 });
  return (
    <span ref={ref} className={styles.hl}>
      <span className={cx(styles.bar, inView && styles.barOn)} aria-hidden="true" />
      <span className={styles.text}>{children}</span>
    </span>
  );
}
