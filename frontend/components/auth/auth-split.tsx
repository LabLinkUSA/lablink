import type { ReactNode } from "react";

import styles from "./auth-split.module.css";

export function AuthSplit({ aside, card }: { aside: ReactNode; card: ReactNode }) {
  return (
    <section className={`auth-screen-root ${styles.page}`}>
      <div className={styles.frame}>
        <div data-auth-aside className={styles.aside}>
          <div className={styles.orbit} aria-hidden="true"><span className={styles.orbitDot} /></div>
          <div className={styles.orbitDashed} aria-hidden="true" />
          <div className={styles.asideContent}>{aside}</div>
        </div>
        <div data-auth-card className={styles.card}>{card}</div>
      </div>
    </section>
  );
}
