"use client";

import { useEffect, useState, type ReactNode } from "react";

type SidebarIconKey =
  | "shield"
  | "listings"
  | "competition"
  | "requests"
  | "saved"
  | "board";

type SectionTone = "primary" | "secondary" | "tertiary";

type DashboardSidebarSection = {
  id: string;
  title: string;
  shortLabel: string;
  description?: string;
  count: number;
  icon: SidebarIconKey;
  tone?: SectionTone;
  content: ReactNode;
};

function LabLinkWorkspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.2 5.5 6.2v5.4c0 4.2 2.7 7.9 6.5 9.2 3.8-1.3 6.5-5 6.5-9.2V6.2Zm0 2.1 4.7 2.1v4.2c0 3.1-1.9 5.8-4.7 6.9-2.8-1.1-4.7-3.8-4.7-6.9V7.4Zm-2 3.2h4.1v1.4H10Zm0 3.1h4.8V13H10Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CollapseRailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.75 5.75h12.5A1.75 1.75 0 0 1 20 7.5v9a1.75 1.75 0 0 1-1.75 1.75H5.75A1.75 1.75 0 0 1 4 16.5v-9a1.75 1.75 0 0 1 1.75-1.75Zm0 1.5a.25.25 0 0 0-.25.25v9c0 .14.11.25.25.25H9.5v-9.5Zm5.25 9.5h7.25a.25.25 0 0 0 .25-.25v-9a.25.25 0 0 0-.25-.25H11Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.2 5.5 6.2v5.4c0 4.2 2.7 7.9 6.5 9.2 3.8-1.3 6.5-5 6.5-9.2V6.2Zm0 2.1 4.7 2.1v4.2c0 3.1-1.9 5.8-4.7 6.9-2.8-1.1-4.7-3.8-4.7-6.9V7.4Zm-2 3.2h4.1v1.4H10Zm0 3.1h4.8V13H10Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ListingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 4.75h11A1.75 1.75 0 0 1 19.25 6.5v11A1.75 1.75 0 0 1 17.5 19.25h-11A1.75 1.75 0 0 1 4.75 17.5v-11A1.75 1.75 0 0 1 6.5 4.75Zm0 1.5a.25.25 0 0 0-.25.25v11c0 .14.11.25.25.25h11a.25.25 0 0 0 .25-.25v-11a.25.25 0 0 0-.25-.25Zm2 2h7v1.5h-7Zm0 3.5h7v1.5h-7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CompetitionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 5.5a2.5 2.5 0 1 1-.01 5.01A2.5 2.5 0 0 1 7 5.5Zm10 8a2.5 2.5 0 1 1-.01 5.01A2.5 2.5 0 0 1 17 13.5Zm-8.45-4.2 6.9 5.4-.92 1.17-6.9-5.4Zm6.07-1.98.92 1.17-6.06 4.77-.93-1.18Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RequestsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.75 5.25h8.5A1.75 1.75 0 0 1 18 7v10a1.75 1.75 0 0 1-1.75 1.75h-8.5A1.75 1.75 0 0 1 6 17V7a1.75 1.75 0 0 1 1.75-1.75Zm0 1.5a.25.25 0 0 0-.25.25v10c0 .14.11.25.25.25h8.5A.25.25 0 0 0 16.5 17V7a.25.25 0 0 0-.25-.25Zm1.75 2h5v1.5h-5Zm0 3.25h5v1.5h-5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SavedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4.75h10A1.75 1.75 0 0 1 18.75 6.5v12.75l-6.75-3.24-6.75 3.24V6.5A1.75 1.75 0 0 1 7 4.75Zm0 1.5a.25.25 0 0 0-.25.25v10.37l5.25-2.52 5.25 2.52V6.5a.25.25 0 0 0-.25-.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.5 6.25h9A1.25 1.25 0 0 1 17.75 7.5v9a1.25 1.25 0 0 1-1.25 1.25h-9A1.25 1.25 0 0 1 6.25 16.5v-9A1.25 1.25 0 0 1 7.5 6.25Zm.25 1.5v8.5h8.5v-8.5Zm1.5 1.5h5.5v1.5h-5.5Zm0 3h5.5v1.5h-5.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function renderSidebarIcon(icon: SidebarIconKey) {
  switch (icon) {
    case "shield":
      return <ShieldIcon />;
    case "listings":
      return <ListingsIcon />;
    case "competition":
      return <CompetitionIcon />;
    case "requests":
      return <RequestsIcon />;
    case "saved":
      return <SavedIcon />;
    case "board":
      return <BoardIcon />;
    default:
      return <ListingsIcon />;
  }
}

export function DashboardSidebarShell({
  brandSubtitle,
  header,
  sections,
}: {
  brandSubtitle: string;
  header: ReactNode;
  sections: DashboardSidebarSection[];
}) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem("lablink-admin-sidebar-collapsed");
    if (storedValue === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("lablink-admin-sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const observedSections = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (observedSections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visibleEntries[0]?.target.id) {
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.55],
      },
    );

    observedSections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [sections]);

  function scrollToSection(sectionId: string) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={`admin-ops-shell ${isSidebarCollapsed ? "admin-ops-shell-collapsed" : ""}`}>
      <aside
        className={`admin-ops-nav ${isSidebarCollapsed ? "admin-ops-nav-collapsed" : ""}`}
        aria-label="Dashboard sections"
      >
        <div className="admin-ops-nav-panel">
          <div className="admin-ops-nav-chrome">
            {!isSidebarCollapsed ? (
              <div className="admin-ops-nav-brand">
                <span className="admin-ops-nav-brand-mark" aria-hidden="true">
                  <LabLinkWorkspaceIcon />
                </span>
                <div className="admin-ops-nav-brand-copy">
                  <strong>LabLink</strong>
                  <span>{brandSubtitle}</span>
                </div>
              </div>
            ) : (
              <div />
            )}
            <button
              type="button"
              className="admin-ops-nav-toggle"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              aria-label={isSidebarCollapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"}
              title={isSidebarCollapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"}
            >
              <CollapseRailIcon />
            </button>
          </div>

          <nav className="admin-ops-nav-list">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`admin-ops-nav-button ${activeSection === section.id ? "admin-ops-nav-button-active" : ""}`}
                onClick={() => scrollToSection(section.id)}
                aria-label={section.title}
                title={section.title}
              >
                <span className="admin-ops-nav-button-icon" aria-hidden="true">
                  {renderSidebarIcon(section.icon)}
                </span>
                {!isSidebarCollapsed ? (
                  <span className="admin-ops-nav-button-body">
                    <span className="admin-ops-nav-button-title">
                      <span>{section.title}</span>
                      <strong>{section.count}</strong>
                    </span>
                    {section.description ? <span className="admin-ops-nav-button-copy">{section.description}</span> : null}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="admin-ops-content">
        <div className="admin-ops-content-header">{header}</div>
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="admin-ops-section" data-admin-section>
            <div className="admin-ops-section-intro">
              <h2>
                <span className={`ops-section-accent ops-section-accent-${section.tone ?? "primary"}`} />
                {section.title}
              </h2>
              {section.description ? <p>{section.description}</p> : null}
            </div>
            {section.content}
          </section>
        ))}
      </div>
    </div>
  );
}
