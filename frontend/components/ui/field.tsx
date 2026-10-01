import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Children, cloneElement, isValidElement } from "react";

import { cx } from "./cx";
import styles from "./field.module.css";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  span,
  required,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  span?: "full";
  required?: boolean;
  children: ReactNode;
}) {
  const describedBy = [hint ? `${htmlFor}-hint` : null, error ? `${htmlFor}-error` : null].filter(Boolean).join(" ") || undefined;
  const control = Children.only(children);
  const wired = isValidElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>(control)
    ? cloneElement(control, { "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
    : control;

  return (
    <div className={cx(styles.field, span === "full" && styles.full)}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required ? <span className={styles.required} aria-hidden="true"> *</span> : null}
      </label>
      {wired}
      {hint ? <p id={`${htmlFor}-hint`} className={styles.hint}>{hint}</p> : null}
      {error ? <p id={`${htmlFor}-error`} className={styles.error}>{error}</p> : null}
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} className={cx(styles.control, invalid && styles.invalid, className)} />;
}

export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select {...rest} className={cx(styles.control, styles.select, invalid && styles.invalid, className)}>
      {children}
    </select>
  );
}

export function Textarea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} className={cx(styles.control, styles.textarea, invalid && styles.invalid, className)} />;
}

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cx(styles.checkbox, className)}>
      <input {...rest} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}
