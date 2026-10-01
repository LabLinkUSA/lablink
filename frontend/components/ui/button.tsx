import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./button.module.css";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ink" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type Shared = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  return cx(styles.button, styles[variant], styles[size], block && styles.block, className);
}

function Arrow() {
  return (
    <span className={styles.arrow} aria-hidden="true">
      →
    </span>
  );
}

export function Button({
  variant,
  size,
  block,
  arrow,
  className,
  children,
  type = "button",
  ...rest
}: Shared & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} type={type} className={buttonClass({ variant, size, block, className })}>
      {children}
      {arrow ? <Arrow /> : null}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  block,
  arrow,
  className,
  children,
  ...rest
}: Shared & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link {...rest} href={href} className={buttonClass({ variant, size, block, className })}>
      {children}
      {arrow ? <Arrow /> : null}
    </Link>
  );
}
