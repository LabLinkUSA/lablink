"use client";

import { useEffect, useState, type ReactNode } from "react";

import { CollapseRailIcon, DashboardIcon, type DashboardIconName } from "./dashboard-icons";
import styles from "./dashboard-shell.module.css";

export type DashboardSection = {
  id: string;
  title: string;
  description?: string;
  count?: number;
  icon: DashboardIconName;
  content: ReactNode;
  action?: ReactNode;
};

const COLLAPSE_KEY = "lablink-admin-sidebar-collapsed";

export function DashboardShell({
  brandSubtitle,
  header,
  sections,
}: {
  brandSubtitle: string;
  header: ReactNode;
  sections: DashboardSection[];
}) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const sectionKey = sections.map((section) => section.id).join("|");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(COLLAPSE_KEY) === "true") {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const observed = sectionKey
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (observed.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.35, 0.55] },
    );

    observed.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sectionKey]);

  function scrollToSection(sectionId: string) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <div className={`${styles.shell} ${isCollapsed ? styles.collapsed : ""}`}>
      <aside className={styles.rail} aria-label="Dashboard sections" data-dashboard-rail>
        <div className={styles.railHeader}>
          <span className={styles.workspace}>{brandSubtitle}</span>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={isCollapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"}
            title={isCollapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"}
          >
            <CollapseRailIcon />
          </button>
        </div>
        <nav className={styles.navList}>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`}
              onClick={() => scrollToSection(section.id)}
              aria-label={section.title}
              aria-current={activeSection === section.id ? "true" : undefined}
              title={section.title}
            >
              <span className={styles.navIcon} aria-hidden="true">
                <DashboardIcon name={section.icon} />
              </span>
              <span className={styles.navLabel}>{section.title}</span>
              {section.count !== undefined ? <span className={styles.navCount}>{section.count}</span> : null}
            </button>
          ))}
        </nav>
      </aside>

      <div className={styles.content}>
        <div className={styles.header}>{header}</div>
        <nav className={styles.tabs} aria-label="Dashboard section tabs" data-dashboard-tabs>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`${styles.tab} ${activeSection === section.id ? styles.tabActive : ""}`}
              aria-current={activeSection === section.id ? "true" : undefined}
              onClick={() => scrollToSection(section.id)}
            >
              {section.title}
            </button>
          ))}
        </nav>
        {sections.map((section) => (
          <section key={section.id} id={section.id} className={styles.section} data-admin-section>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                {section.description ? <p className={styles.sectionLead}>{section.description}</p> : null}
              </div>
              {section.action}
            </div>
            {section.content}
          </section>
        ))}
      </div>
    </div>
  );
}
