"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cx } from "./cx";
import styles from "./stat-tile.module.css";

const NUMERIC = /^(\$?)(\d+(?:\.\d+)?)([K%+]?)$/;
const DURATION_MS = 1600;

function parseValue(value: ReactNode) {
  const match = NUMERIC.exec(typeof value === "number" ? String(value) : typeof value === "string" ? value : "");
  if (!match) return null;
  return {
    prefix: match[1],
    target: Number(match[2]),
    decimals: match[2].includes(".") ? match[2].split(".")[1].length : 0,
    suffix: match[3],
  };
}

function CountUp({ value }: { value: ReactNode }) {
  const parsed = parseValue(value);
  const [current, setCurrent] = useState<number | null>(null);
  const target = parsed?.target ?? null;

  useEffect(() => {
    if (target === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    setCurrent(0);
    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      setCurrent(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setCurrent(null);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (!parsed || current === null) return <>{value}</>;
  return (
    <>
      {parsed.prefix}
      {current.toFixed(parsed.decimals)}
      {parsed.suffix}
    </>
  );
}

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
      <div className={styles.value}>
        <CountUp value={value} />
      </div>
      <div className={styles.label}>{label}</div>
      {sublabel ? <div className={styles.sublabel}>{sublabel}</div> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
