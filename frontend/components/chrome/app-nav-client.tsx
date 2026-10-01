"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NotificationBell } from "@/components/notification-center";
import { cx } from "@/components/ui/cx";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import styles from "./app-nav.module.css";
import type { NavLink, NavModel } from "./nav-model";

function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}

function scrollToHash(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  const target = document.querySelector(href);
  if (!target) return;
  event.preventDefault();
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
}

export function AppNavClient({ model }: { model: NavModel }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const signedOutHome = isHome && !model.profile;
  const items: NavLink[] = signedOutHome ? model.homeLinks : model.links;
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const accountButton = useRef<HTMLButtonElement>(null);
  const accountRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);
  useEscape(menuOpen, () => {
    setMenuOpen(false);
    menuButton.current?.focus();
  });
  useEscape(accountOpen, () => {
    setAccountOpen(false);
    accountButton.current?.focus();
  });

  useEffect(() => {
    if (!accountOpen) return;
    const handler = (event: PointerEvent) => {
      if (!accountRoot.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [accountOpen]);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
    window.location.replace("/");
  }

  const linkList = items.map((item) => {
    const active = !item.href.startsWith("#") && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
    return (
      <a
        key={`${item.label}-${item.href}`}
        href={item.href}
        className={cx(styles.navLink, active && styles.navLinkActive)}
        aria-current={active ? "page" : undefined}
        onClick={item.href.startsWith("#") ? (event) => scrollToHash(event, item.href) : undefined}
      >
        {item.label}
      </a>
    );
  });

  return (
    <header className={cx(styles.nav, isHome && styles.navHome, signedOutHome && styles.navHomeSignedOut)}>
      <Link href={model.brandHref} className={styles.navLogo} aria-label="LabLink home">
        <img src="/lablink-header-logo.png" alt="LabLink" className={styles.logoImage} />
      </Link>
      <nav aria-label="Primary" className={styles.navPill}>
        <div className={styles.desktopLinks}>{linkList}</div>
        {model.profile ? (
          <>
            <NotificationBell />
            <div className={styles.account} ref={accountRoot}>
              <button
                ref={accountButton}
                type="button"
                className={styles.avatarButton}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                {model.profile.initial}
              </button>
              {accountOpen ? (
                <div role="menu" className={styles.accountMenu}>
                  <div className={styles.accountIdentity}>
                    <strong>{model.profile.name}</strong>
                    <span>{model.profile.roleLabel}</span>
                    <span>{model.profile.institution}</span>
                    <span className={styles.accountEmail}>{model.profile.email}</span>
                  </div>
                  <Link role="menuitem" href={model.profile.dashboardHref} className={styles.accountItem}>
                    Dashboard
                  </Link>
                  <button role="menuitem" type="button" className={styles.accountItem} onClick={signOut}>
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <Link href="/auth" className={styles.navSignIn}>
            Sign in
          </Link>
        )}
        {items.length > 0 ? (
          <button
            ref={menuButton}
            type="button"
            className={styles.menuButton}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="app-nav-sheet"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" />
          </button>
        ) : null}
      </nav>
      {menuOpen ? (
        <div id="app-nav-sheet" className={styles.sheet}>
          {linkList}
        </div>
      ) : null}
    </header>
  );
}
