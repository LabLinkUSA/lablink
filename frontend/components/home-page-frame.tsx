"use client";

import { useEffect, useRef, useState } from "react";

export function HomePageFrame() {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const syncFrame = () => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const document = frame.contentWindow?.document;
    const availableHeight = Math.max(window.innerHeight - frame.getBoundingClientRect().top, 480);
    document?.documentElement.style.setProperty("--host-viewport-height", `${availableHeight}px`);
    const existingOverride = document?.getElementById("home-redesign-host-overrides");
    if (!existingOverride && document?.head) {
      const override = document.createElement("style");
      override.id = "home-redesign-host-overrides";
      override.textContent = `
        :root {
          --host-right-gutter: 1.125rem;
          --host-nav-top: 6rem;
          --host-nav-left: 1.5rem;
          --host-nav-pad-block: 1rem;
          --host-nav-pad-inline: 1.1rem;
          --host-nav-radius: 0.35rem;
          --host-nav-gap: 0.7rem;
          --host-nav-top-mobile: 5.65rem;
          --host-nav-left-mobile: 1rem;
          --host-nav-pad-block-mobile: 0.85rem;
          --host-nav-pad-inline-mobile: 0.95rem;
          --host-nav-gap-mobile: 0.55rem;
          --host-logo-width: 9rem;
          --host-logo-height: 1.85rem;
        }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: none !important;
          overflow-x: hidden !important;
        }

        body {
          position: relative !important;
          left: var(--host-right-gutter) !important;
          width: calc(100% + var(--host-right-gutter)) !important;
          max-width: calc(100% + var(--host-right-gutter)) !important;
          margin-left: calc(-1 * var(--host-right-gutter)) !important;
        }

        nav {
          position: fixed !important;
          top: var(--host-nav-top) !important;
          left: var(--host-nav-left) !important;
          right: auto !important;
          width: auto !important;
          display: block !important;
          padding: var(--host-nav-pad-block) var(--host-nav-pad-inline) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: var(--host-nav-radius) !important;
          background: rgba(26, 58, 42, 0.72) !important;
          backdrop-filter: blur(14px) !important;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18) !important;
        }

        nav .nav-logo {
          display: none !important;
        }

        nav ul {
          display: flex !important;
          flex-direction: column !important;
          gap: var(--host-nav-gap) !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        nav ul li a {
          display: block !important;
          padding: 0.15rem 0 !important;
          color: rgba(255, 255, 255, 0.74) !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28) !important;
        }

        nav ul li a:hover {
          color: #ffffff !important;
        }

        footer .footer-brand {
          font-size: 0 !important;
          line-height: 0 !important;
        }

        footer .footer-brand::before {
          content: "" !important;
          display: inline-block !important;
          width: var(--host-logo-width) !important;
          height: var(--host-logo-height) !important;
          background-image: url("/lablink-header-logo.png") !important;
          background-repeat: no-repeat !important;
          background-position: left center !important;
          background-size: contain !important;
          vertical-align: middle !important;
        }

        .hero {
          min-height: var(--host-viewport-height) !important;
        }

        .hero-right {
          height: var(--host-viewport-height) !important;
        }

        @media (max-width: 900px) {
          nav {
            top: var(--host-nav-top-mobile) !important;
            left: var(--host-nav-left-mobile) !important;
            padding: var(--host-nav-pad-block-mobile) var(--host-nav-pad-inline-mobile) !important;
          }

          nav ul {
            gap: var(--host-nav-gap-mobile) !important;
          }
        }
      `;
      document.head.appendChild(override);
    }

    const nextHeight = document?.documentElement.scrollHeight;
    if (nextHeight) {
      setHeight(nextHeight);
    }
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    syncFrame();
    window.addEventListener("resize", syncFrame);

    return () => {
      window.removeEventListener("resize", syncFrame);
    };
  }, []);

  return (
    <iframe
      ref={frameRef}
      src="/home-redesign.html"
      title="LabLink home page redesign"
      className="home-redesign-frame"
      onLoad={syncFrame}
      style={{ height: height ? `${height}px` : "100svh" }}
    />
  );
}
