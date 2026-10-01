import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./notice.module.css";

export function Notice({
  tone,
  className,
  children,
}: {
  tone: "success" | "error" | "warning" | "info";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx(styles.notice, styles[tone], className)}>
      {children}
    </div>
  );
}
