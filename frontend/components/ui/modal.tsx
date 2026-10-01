"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

import { cx } from "./cx";
import styles from "./modal.module.css";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  wide = false,
  dismissible = true,
  footer,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  wide?: boolean;
  dismissible?: boolean;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  useEffect(() => {
    const dialog = ref.current;
    return () => {
      const active = document.activeElement;
      if (returnFocus.current?.isConnected && (!active || active === document.body || dialog?.contains(active))) {
        returnFocus.current.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx(styles.dialog, wide && styles.wide, className)}
      onClose={() => {
        onClose();
        returnFocus.current?.focus();
      }}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
      }}
      onClick={(event) => {
        if (dismissible && event.target === ref.current) ref.current?.close();
      }}
    >
      <div className={styles.card}>
        <header className={styles.header}>
          <div>
            {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
            <h2 id={titleId} className={styles.title}>{title}</h2>
          </div>
          <button type="button" className={styles.close} onClick={() => ref.current?.close()} disabled={!dismissible} aria-label="Close">
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  );
}
