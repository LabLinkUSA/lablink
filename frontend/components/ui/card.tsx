import type { HTMLAttributes, ReactNode } from "react";

import styles from "./card.module.css";
import { cx } from "./cx";

export function Card({
  tone = "white",
  interactive = false,
  padding = "md",
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  tone?: "white" | "ink" | "mint";
  interactive?: boolean;
  padding?: "md" | "lg";
  as?: "div" | "article" | "section";
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag {...rest} className={cx(styles.card, styles[tone], styles[padding], interactive && styles.interactive, className)}>
      {children}
    </Tag>
  );
}
