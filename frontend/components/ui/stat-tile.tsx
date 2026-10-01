import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./stat-tile.module.css";

export function StatTile({
  tone = "white",
  value,
  label,
  sublabel,
}: {
  tone?: "white" | "ink" | "mint";
  value: ReactNode;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className={cx(styles.tile, styles[tone])} data-stat-tile>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {sublabel ? <div className={styles.sublabel}>{sublabel}</div> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
