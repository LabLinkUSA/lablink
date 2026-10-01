"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button, Checkbox } from "@/components/ui";

import styles from "./catalog.module.css";

export function CategoryFilter({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;

    function focusButton() {
      wrapRef.current?.querySelector<HTMLButtonElement>("button[aria-controls]")?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        focusButton();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
        focusButton();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function toggle(category: string) {
    onChange(selected.includes(category) ? selected.filter((entry) => entry !== category) : [...selected, category]);
  }

  return (
    <div ref={wrapRef} className={styles.categoryWrap}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((current) => !current)}
      >
        Category{selected.length ? ` (${selected.length})` : ""}
      </Button>
      {open ? (
        <div id={popoverId} role="group" aria-label="Category" className={styles.popover}>
          {options.map((category) => (
            <Checkbox
              key={category}
              label={category}
              checked={selected.includes(category)}
              onChange={() => toggle(category)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
