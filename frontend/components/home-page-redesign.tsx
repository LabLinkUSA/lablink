"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import styles from "./home-page-redesign.module.css";

const fieldPhotos = [
  { src: "/home-photo-bethesda-exterior.jpg", alt: "Outside Hospital Bethesda", caption: "Hospital Bethesda — Quetzaltenango" },
  { src: "/home-photo-medical-team.jpg", alt: "With the medical team", caption: "With the Hospital Bethesda medical team" },
  { src: "/home-photo-equipment-lab.jpg", alt: "Assessing equipment in the hospital lab", caption: "Assessing equipment in the hospital lab" },
  {
    src: "/home-photo-yale-new-haven.jpg",
    alt: "Collecting surplus supplies at Yale New Haven Hospital",
    caption: "Collecting surplus at Yale New Haven Hospital",
  },
];

const impactItems = [
  { key: "moved", label: "Equipment value", sublabel: "Donated & in verified stock" },
  { key: "labs", label: "Yale labs", sublabel: "Contacted as donor partners" },
  { key: "schools", label: "Schools served", sublabel: "5 more in active pipeline" },
  { key: "bethesda", label: "Hospital Bethesda", sublabel: "Clinical equipment to Guatemala" },
] as const;

const teamItems = [
  {
    initials: "JS",
    name: "Josh Shin",
    role: "Founder",
    bio: "LabLink's operational backbone. Leads lab outreach, partner coordination, and logistics on the ground. Co-led the Guatemala volunteer medical trip that sparked LabLink's global mission.",
  },
  {
    initials: "SC",
    name: "Sebastian Cuervo",
    role: "Co-Head",
    bio: "Yale undergraduate pursuing an MD-PhD. Researcher in the Garg Lab focused on pediatric brain tumors. EMT and clinical interpreter. First-generation Cambodian-Colombian American.",
  },
  {
    initials: "DL",
    name: "Daniel Lee",
    role: "Chief Technology Officer",
    bio: "Leads back-end development and the website platform. Builds the infrastructure that keeps equipment moving from donors to the schools and labs that need it most.",
  },
  {
    initials: "AL",
    name: "Ayden Lee",
    role: "Chief Operating Officer",
    bio: "Drives outreach to schools, research labs, and hospitals. Builds the partnerships that connect surplus equipment with institutions that can put it to use.",
  },
];

const RING_LENGTH = 326.7;

function Highlight({ children }: { children: string }) {
  return (
    <span data-hl="" className={styles.hl}>
      <span className={styles.hlBar} />
      <span className={styles.hlText}>{children}</span>
    </span>
  );
}

function FlowConnector() {
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" className={styles.flowConnector}>
      <path d="M0 20 H120" fill="none" stroke="#10C79A" strokeWidth="2" strokeDasharray="8 8" className={styles.flowDash} />
      <circle cx="112" cy="20" r="4" fill="#10C79A" />
    </svg>
  );
}

function delay(seconds: number): CSSProperties {
  return { transitionDelay: `${seconds}s` };
}

export function HomePageRedesign() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [counters, setCounters] = useState({ k: 0, im: 0, pk: 0 });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const frames: number[] = [];
    const observers: IntersectionObserver[] = [];
    const cleanups: (() => void)[] = [];

    function listen<K extends keyof HTMLElementEventMap>(
      el: HTMLElement,
      type: K,
      handler: (event: HTMLElementEventMap[K]) => void,
    ) {
      el.addEventListener(type, handler);
      cleanups.push(() => el.removeEventListener(type, handler));
    }

    function tween(key: "k" | "im" | "pk", duration: number, wait: number) {
      const t0 = performance.now() + wait;
      const step = (now: number) => {
        const p = Math.min(1, Math.max(0, (now - t0) / duration));
        setCounters((current) => ({ ...current, [key]: 1 - Math.pow(1 - p, 3) }));
        if (p < 1) {
          frames.push(requestAnimationFrame(step));
        }
      };
      frames.push(requestAnimationFrame(step));
    }

    function observe(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
      const observer = new IntersectionObserver(callback, options);
      observers.push(observer);
      return observer;
    }

    const q = <T extends HTMLElement = HTMLElement>(selector: string) =>
      Array.from(root.querySelectorAll<T>(selector));
    const show = (el: HTMLElement) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    };

    // Anchor links scroll with an offset for the fixed header.
    q<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
      listen(a, "click", (event) => {
        const target = document.querySelector(a.getAttribute("href") ?? "");
        if (!target) {
          return;
        }
        event.preventDefault();
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
      }),
    );

    // Field photos clip in when scrolled into view.
    const ftilts = q("[data-ftilt]");
    const fio = observe(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.firstElementChild?.classList.add(styles.fieldClipIn);
            fio.unobserve(entry.target);
          }
        }),
      { threshold: 0.15 },
    );
    ftilts.forEach((figure) => fio.observe(figure));

    // Reveal-on-scroll blocks.
    const io = observe(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target as HTMLElement);
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );
    q("[data-reveal]").forEach((el) => io.observe(el));

    // Counters.
    tween("k", 1600, 900);
    const impact = root.querySelector("[data-impact]");
    if (impact) {
      const io2 = observe(
        (entries) => {
          if (entries[0].isIntersecting) {
            tween("im", 1800, 100);
            io2.disconnect();
          }
        },
        { threshold: 0.25 },
      );
      io2.observe(impact);
    }

    const ring = root.querySelector<SVGCircleElement>("[data-ring]");
    const ringWrap = ring?.closest("div");
    if (ring && ringWrap) {
      const io3 = observe(
        (entries) => {
          if (entries[0].isIntersecting) {
            ring.style.strokeDashoffset = String(RING_LENGTH * (1 - 0.46));
            tween("pk", 1800, 300);
            io3.disconnect();
          }
        },
        { threshold: 0.4 },
      );
      io3.observe(ringWrap);
    }

    q("[data-hl]").forEach((hl) => {
      const io4 = observe(
        (entries) => {
          if (entries[0].isIntersecting) {
            (hl.firstElementChild as HTMLElement).style.transform = "scaleX(1)";
            io4.disconnect();
          }
        },
        { threshold: 0.5 },
      );
      io4.observe(hl);
    });

    // Scroll progress bar.
    const progress = root.querySelector<HTMLElement>("[data-progress]");
    const onScroll = () => {
      const sy = window.scrollY;
      const vh = window.innerHeight;
      const dh = document.documentElement.scrollHeight - vh;
      if (progress) {
        progress.style.width = `${dh > 0 ? (sy / dh) * 100 : 0}%`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });

    // Mouse: hero tilt, photo tilt, magnetic buttons, team spotlight.
    const hero = root.querySelector<HTMLElement>("[data-hero]");
    const tilt = root.querySelector<HTMLElement>("[data-tilt]");
    if (hero && tilt) {
      listen(hero, "mousemove", (event) => {
        const r = hero.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width - 0.5;
        const y = (event.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = `perspective(1200px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
      });
      listen(hero, "mouseleave", () => {
        tilt.style.transform = "perspective(1200px) rotateY(0) rotateX(0)";
      });
    }

    ftilts.forEach((figure) => {
      listen(figure, "mousemove", (event) => {
        const r = figure.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width - 0.5;
        const y = (event.clientY - r.top) / r.height - 0.5;
        figure.style.transform = `perspective(1200px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      listen(figure, "mouseleave", () => {
        figure.style.transform = "perspective(1200px) rotateY(0) rotateX(0)";
      });
    });

    q("[data-magnet]").forEach((button) => {
      listen(button, "mousemove", (event) => {
        const r = button.getBoundingClientRect();
        const x = event.clientX - r.left - r.width / 2;
        const y = event.clientY - r.top - r.height / 2;
        button.style.transform = `translate(${x * 0.25}px,${y * 0.35}px)`;
      });
      listen(button, "mouseleave", () => {
        button.style.transform = "translate(0,0)";
      });
    });

    q("[data-teamcard]").forEach((card) => {
      const spot = card.querySelector<HTMLElement>("[data-spot]");
      if (!spot) {
        return;
      }
      listen(card, "mousemove", (event) => {
        const r = card.getBoundingClientRect();
        spot.style.left = `${event.clientX - r.left}px`;
        spot.style.top = `${event.clientY - r.top}px`;
        spot.style.opacity = "1";
      });
      listen(card, "mouseleave", () => {
        spot.style.opacity = "0";
      });
    });

    return () => {
      frames.forEach((frame) => cancelAnimationFrame(frame));
      observers.forEach((observer) => observer.disconnect());
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  const { k, im, pk } = counters;
  const heroMoved = `$${Math.round(40 * k)}K`;
  const pct = `${Math.round(46 * pk)}%`;
  const impactValues = {
    moved: `$${Math.round(40 * im)}K`,
    labs: `${Math.round(400 * im)}+`,
    schools: String(Math.round(3 * im)),
    bethesda: `$${Math.round(6 * im)}K`,
  };

  return (
    <div ref={rootRef} className={styles.home}>
      <div className={styles.progressTrack}>
        <div data-progress="" className={styles.progressBar} />
      </div>

      <header className={styles.nav}>
        <a href="/" className={styles.navLogo}>
          <img src="/lablink-header-logo.png" alt="LabLink" className={styles.logoImage} />
        </a>
        <div className={styles.navPill}>
          <a href="#mission" className={styles.navLink}>
            Mission
          </a>
          <a href="#team" className={styles.navLink}>
            Team
          </a>
          <a href="/auth" className={styles.navSignIn}>
            Sign in
          </a>
        </div>
      </header>

      <section data-hero="" className={styles.hero}>
        <div className={styles.heroOrb}>
          <span className={styles.orbDot} />
        </div>
        <div className={styles.heroOrbDashed} />

        <div className={styles.heroCopy}>
          <div className={styles.heroBadge}>
            <span className={styles.pulseWrap}>
              <span className={styles.pulseDot} />
              <span className={styles.pulseRing} />
            </span>
            Yale-founded · Student-run · Nonprofit
          </div>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroLine}>
              <span className={styles.heroWord} style={{ animationDelay: ".35s" }}>
                Surplus
              </span>
            </span>
            <span className={styles.heroLine}>
              <span className={styles.heroWord} style={{ animationDelay: ".48s" }}>
                equipment.
              </span>
            </span>
            <span className={`${styles.heroLine} ${styles.heroLineLast}`}>
              <em className={`${styles.heroWord} ${styles.heroEm}`} style={{ animationDelay: ".62s" }}>
                Real impact.
              </em>
            </span>
          </h1>
          <p className={styles.heroSub}>
            A Yale-founded nonprofit turning idle university lab equipment into hands-on science tools for
            under-resourced schools and hospitals across the U.S. and globally.
          </p>
          <div className={styles.heroActions}>
            <a href="/auth" data-magnet="" className={styles.heroPrimary}>
              Donate equipment <span className={styles.heroPrimaryArrow}>→</span>
            </a>
            <a href="/auth" data-magnet="" className={styles.heroSecondary}>
              Request equipment
            </a>
          </div>
        </div>

        <div data-tilt="" className={styles.heroMedia}>
          <a href="#team" aria-label="About us" className={styles.heroCard}>
            <img src="/home-hero-team.jpg" alt="The LabLink team" className={styles.heroImage} />
            <div className={styles.heroShade} />
            <div className={styles.heroCardFooter}>
              <div className={styles.heroCardTitle}>The team</div>
              <span className={styles.heroCardArrow}>→</span>
            </div>
          </a>
          <div className={styles.heroFloat}>
            <div className={styles.heroFloatValue}>{heroMoved}</div>
            <div className={styles.heroFloatLabel}>equipment moved</div>
          </div>
        </div>

        <div className={styles.scrollHint}>
          <span className={styles.scrollTrack}>
            <span className={styles.scrollThumb} />
          </span>
          Scroll
        </div>
      </section>

      <section id="mission" className={styles.section}>
        <div className={styles.container}>
          <h2 data-reveal="" className={`${styles.missionTitle} ${styles.reveal28}`} style={delay(0.1)}>
            Our <Highlight>Mission</Highlight>
          </h2>

          <div className={styles.missionGrid}>
            <div data-reveal="" className={styles.reveal28}>
              <p className={styles.missionText}>
                Universities retire functional microscopes, centrifuges, pipettes, and surgical tools every year. At the
                same time, under-resourced schools run science labs with a fraction of what they need — and rural
                hospitals in low-income countries operate without basic diagnostic tools.
              </p>
              <p className={`${styles.missionText} ${styles.missionTextNext}`}>
                LabLink bridges that gap: a circular-economy nonprofit connecting lab surplus to the communities that
                need it most — locally in New Haven and globally through health partners like Hospital Bethesda.
              </p>
            </div>
            <div data-reveal="" className={`${styles.statCard} ${styles.reveal28}`} style={delay(0.15)}>
              <div className={styles.ringWrap}>
                <svg viewBox="0 0 120 120" className={styles.ring}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
                  <circle
                    data-ring=""
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="#10C79A"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING_LENGTH}
                    strokeDashoffset={RING_LENGTH}
                    className={styles.ringProgress}
                  />
                </svg>
                <div className={styles.ringValue}>{pct}</div>
              </div>
              <div>
                <div className={styles.statCardTitle}>of needed equipment</div>
                <p className={styles.statCardText}>
                  is all the average under-resourced school science lab actually has on its shelves.
                </p>
              </div>
            </div>
          </div>

          <div data-reveal="" className={`${styles.flow} ${styles.reveal28}`}>
            <div className={`${styles.flowCard} ${styles.flowSupply}`}>
              <div className={styles.flowStep}>01 · Supply</div>
              <div className={styles.flowTitle}>Labs post surplus</div>
              <p className={styles.flowText}>
                400+ Yale research labs contacted. Working instruments listed instead of discarded.
              </p>
            </div>
            <FlowConnector />
            <div className={`${styles.flowCard} ${styles.flowVerify}`}>
              <div className={styles.flowStep}>02 · Verify</div>
              <div className={styles.flowTitle}>LabLink checks &amp; matches</div>
              <p className={styles.flowText}>
                Every item and institution is admin-reviewed. Refurbished, packed, and routed.
              </p>
            </div>
            <FlowConnector />
            <div className={`${styles.flowCard} ${styles.flowDeliver}`}>
              <div className={styles.flowStep}>03 · Deliver</div>
              <div className={styles.flowTitle}>Schools &amp; hospitals receive</div>
              <p className={styles.flowText}>3 New Haven schools served, 5 in pipeline, and one hospital in Guatemala.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div data-reveal="" className={`${styles.fieldHeading} ${styles.reveal24}`}>
            <div>
              <h2 className={styles.sectionTitle}>
                The work, <Highlight>up close.</Highlight>
              </h2>
            </div>
          </div>
          <div className={styles.fieldGrid}>
            {fieldPhotos.map((photo, index) => (
              <figure
                key={photo.src}
                data-ftilt=""
                className={styles.fieldFigure}
                style={{ "--d": `${index * 0.12}s` } as CSSProperties}
              >
                <div className={styles.fieldClip}>
                  <img src={photo.src} alt={photo.alt} className={styles.coverImage} />
                  <figcaption className={styles.fieldCaption}>{photo.caption}</figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section data-impact="" className={`${styles.section} ${styles.impact}`}>
        <div className={`${styles.container} ${styles.impactInner}`}>
          <div data-reveal="" className={styles.reveal24}>
            <h2 className={styles.impactTitle}>
              Our <Highlight>Impact</Highlight>
            </h2>
          </div>
          <div className={styles.impactGrid}>
            {impactItems.map((item, index) => (
              <div
                key={item.key}
                data-reveal=""
                className={`${styles.impactCard} ${styles.reveal24}`}
                style={{ transitionDelay: `${index * 0.08}s, 0s` }}
              >
                <div className={styles.impactValue}>{impactValues[item.key]}</div>
                <div className={styles.impactLabel}>{item.label}</div>
                <div className={styles.impactSub}>{item.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className={styles.section}>
        <div className={styles.container}>
          <div data-reveal="" className={`${styles.teamHeading} ${styles.reveal24}`}>
            <div>
              <h2 className={styles.sectionTitle}>
                <Highlight>About Us</Highlight>
              </h2>
            </div>
          </div>
          <div className={styles.teamGrid}>
            {teamItems.map((member, index) => (
              <div
                key={member.name}
                data-reveal=""
                data-teamcard=""
                className={`${styles.teamCard} ${styles.reveal24}`}
                style={{ transitionDelay: `${index * 0.06}s, ${index * 0.06}s, 0s` }}
              >
                <span data-spot="" className={styles.teamSpot} />
                <div className={styles.teamAvatar}>{member.initials}</div>
                <div className={styles.teamName}>{member.name}</div>
                <div className={styles.teamRole}>{member.role}</div>
                <p className={styles.teamBio}>{member.bio}</p>
              </div>
            ))}
            <a
              href="/auth"
              data-reveal=""
              className={`${styles.joinCard} ${styles.reveal24}`}
              style={{ transitionDelay: ".24s, .24s, 0s" }}
            >
              <div className={styles.joinAvatar}>+5</div>
              <div>
                <div className={styles.joinTitle}>Join the volunteer team</div>
                <p className={styles.joinText}>
                  Yale undergraduates managing intake, outreach, refurbishment, and school partnerships.
                </p>
                <div className={styles.joinCta}>Reach out →</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaOrbOuter}>
          <div className={styles.ctaOrbOuterRing} />
          <div className={styles.ctaOrbOuterSpin}>
            <span className={styles.ctaOrbOuterDot} />
          </div>
        </div>
        <div className={styles.ctaOrbInner}>
          <div className={styles.ctaOrbInnerRing} />
          <div className={styles.ctaOrbInnerSpin}>
            <span className={styles.ctaOrbInnerDot} />
          </div>
        </div>
        <div data-reveal="" className={`${styles.ctaContent} ${styles.reveal24}`}>
          <div className={styles.ctaEyebrow}>Get involved</div>
          <h2 className={styles.ctaTitle}>
            Put idle equipment <em className={styles.ctaEm}>back to work.</em>
          </h2>
          <p className={styles.ctaText}>
            Labs list surplus. Schools and hospitals request what they need. LabLink verifies and moves it — no cost to
            either side.
          </p>
          <div className={styles.ctaActions}>
            <a href="/auth" data-magnet="" className={styles.ctaPrimary}>
              I have equipment to donate
            </a>
            <a href="/auth" data-magnet="" className={styles.ctaSecondary}>
              My institution needs equipment
            </a>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <img src="/lablink-header-logo.png" alt="LabLink" className={styles.logoImage} />
            <div className={styles.footerMeta}>A Yale nonprofit · New Haven, CT · Founded 2024</div>
          </div>
          <p className={styles.footerNote}>
            LabLink v1 is a managed donation marketplace. Verified donor labs and recipient institutions move through
            admin-reviewed workflows, not direct checkout.
          </p>
        </div>
      </footer>
    </div>
  );
}
