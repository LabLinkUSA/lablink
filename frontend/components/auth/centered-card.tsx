import type { ReactNode } from "react";

import styles from "./centered-card.module.css";

export function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <section className={styles.page}>
      <div className={styles.ring} aria-hidden="true" />
      <div data-centered-card className={styles.card}>{children}</div>
    </section>
  );
}
