"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { cx } from "./cx";
import styles from "./reveal.module.css";

export function useInView<T extends Element>(
  options: IntersectionObserverInit = { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
    // options are static per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
}

type RevealState = "static" | "pending" | "shown";

export function Reveal({
  as: tag = "div",
  delay = 0,
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "li";
  delay?: number;
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
}) {
  // Narrowed to "div" for typing only; the rendered tag is still `tag`.
  const Tag = tag as "div";
  const ref = useRef<HTMLDivElement>(null);
  // "static" on the server and without JS: content is fully visible.
  const [state, setState] = useState<RevealState>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only hide elements that start below the fold, so nothing visible flashes.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      {...rest}
      ref={ref}
      data-reveal={state}
      className={cx(styles.reveal, className)}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
