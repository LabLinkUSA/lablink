import { cx } from "./cx";
import styles from "./avatar.module.css";

export function Avatar({
  initials,
  variant = "ink",
  size = "md",
}: {
  initials: string;
  variant?: "ink" | "dashed";
  size?: "md" | "lg";
}) {
  return (
    <span className={cx(styles.avatar, styles[variant], styles[size])} aria-hidden="true">
      {initials}
    </span>
  );
}
