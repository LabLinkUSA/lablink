import Image from "next/image";

import styles from "./home-page-redesign.module.css";

const timelineItems = [
  {
    date: "Fall 2024 — Month 1",
    title: "The Idea",
    body: "Sebastian Cuervo and Josh Shin noticed Yale labs discarding functional equipment. Schools two miles away couldn't afford basic science tools. The mismatch was obvious. LabLink was born.",
  },
  {
    date: "Month 2–3",
    title: "400+ Labs Contacted",
    body: "The team systematically reached out to Yale's research labs — biology, chemistry, biomedical engineering, neuroscience. Surplus equipment started flowing in.",
  },
  {
    date: "Month 4–5",
    title: "First School Partners",
    body: "Three New Haven schools began receiving donated equipment. Five more entered the pipeline. Students who had never touched a real centrifuge or pipette now had access in their classrooms.",
  },
  {
    date: "Month 6",
    title: "Hospital Bethesda, Guatemala",
    body: "During a volunteer medical trip to Quetzaltenango, Sebastian saw a rural hospital running on outdated, broken equipment. LabLink shipped two centrifuges and surgical instruments — $6,000 in clinical value — to Hospital Bethesda. Our first international partner.",
  },
  {
    date: "Month 7",
    title: "Platform Launch",
    body: "Built on Next.js and FastAPI, the LabLink marketplace is ready to deploy — a two-sided platform where labs post surplus and schools and hospitals submit requests. The supply chain is built. Now it scales.",
  },
  {
    date: "Now",
    title: "$40,000 Moved. Just Getting Started.",
    body: "$10,000 in donated equipment delivered. $30,000 in verified inventory ready for distribution. 5 student volunteers. 3 schools served. 1 international hospital partner. Zero institutional funding.",
  },
];

const photoItems = [
  {
    src: "/home-photo-bethesda-exterior.jpg",
    alt: "Outside Hospital Bethesda, Quetzaltenango",
    caption: "Hospital Bethesda — Quetzaltenango, Guatemala",
    tall: true,
  },
  {
    src: "/home-photo-medical-team.jpg",
    alt: "Inside the hospital with local medical staff",
    caption: "With the Hospital Bethesda medical team",
  },
  {
    src: "/home-photo-equipment-lab.jpg",
    alt: "Inspecting medical equipment at the clinic",
    caption: "Assessing equipment in the hospital lab",
  },
];

const numberItems = [
  {
    value: "$40K",
    label: "Equipment Value",
    sublabel: "Donated & in verified stock",
  },
  {
    value: "400+",
    label: "Yale Labs",
    sublabel: "Contacted as donor partners",
  },
  {
    value: "3",
    label: "Schools Served",
    sublabel: "5 more in active pipeline",
  },
  {
    value: "$6K",
    label: "Hospital Bethesda",
    sublabel: "Clinical equipment to Guatemala",
  },
];

const teamItems = [
  {
    initials: "SC",
    name: "Sebastian Cuervo",
    role: "Co-Founder",
    bio: "Yale undergraduate pursuing an MD-PhD. Researcher in the Garg Lab focused on pediatric brain tumors. EMT and clinical interpreter. First-generation Cambodian-Colombian American.",
  },
  {
    initials: "JS",
    name: "Josh Shin",
    role: "Co-Founder",
    bio: "Yale undergraduate and LabLink's operational backbone. Leads lab outreach, partner coordination, and logistics on the ground. Co-led the Guatemala volunteer medical trip that sparked LabLink's global mission.",
  },
  {
    initials: "DL",
    name: "Daniel Lee",
    role: "Chief Technology Officer",
    bio: "Leads LabLink's back-end development and website platform. Builds the infrastructure that keeps equipment moving from donors to the schools and labs that need it most.",
  },
  {
    initials: "AL",
    name: "Ayden Lee",
    role: "Chief Operating Officer",
    bio: "Drives LabLink's outreach to schools, research labs, and hospitals. Builds the partnerships that connect surplus equipment with institutions that can put it to use.",
  },
  {
    initials: "+5",
    name: "5 Student Volunteers",
    role: "Core Team",
    bio: "Yale undergraduates managing equipment intake, outreach, refurbishment, and school partnerships. Interested in joining? Reach out.",
    muted: true,
  },
];

export function HomePageRedesign() {
  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={`${styles.heroEyebrow} ${styles.fadeUp}`}>About LabLink</div>
          <h1 className={`${styles.heroTitle} ${styles.fadeUp} ${styles.delay1}`}>
            Surplus equipment.
            <br />
            <em>Real impact.</em>
          </h1>
          <p className={`${styles.heroSub} ${styles.fadeUp} ${styles.delay2}`}>
            A Yale-founded nonprofit turning idle university lab equipment into hands-on science tools for
            under-resourced schools and hospitals across the U.S. and globally.
          </p>
          <div className={`${styles.heroStats} ${styles.fadeUp} ${styles.delay3}`}>
            <div className={styles.stat}>
              <span className={styles.statNum}>$40K</span>
              <span className={styles.statLabel}>Equipment moved</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>400+</span>
              <span className={styles.statLabel}>Labs contacted</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>7 mo</span>
              <span className={styles.statLabel}>Since founding</span>
            </div>
          </div>
        </div>
        <div className={styles.heroRight}>
          <img
            src="/home-hero-hospital-bethesda.jpg"
            alt="Sebastian and Josh outside Hospital Bethesda, Quetzaltenango, Guatemala"
            className={styles.heroImage}
          />
        </div>
      </section>

      <section className={styles.mission} id="mission">
        <div className={styles.missionContent}>
          <span className={styles.sectionLabel}>Our Mission</span>
          <h2 className={styles.sectionTitle}>No equipment should collect dust while a student goes without.</h2>
          <p className={styles.lead}>
            Universities retire functional microscopes, centrifuges, pipettes, and surgical tools every year. At the
            same time, under-resourced schools run science labs with 46% of the equipment they need — and rural
            hospitals in low-income countries operate without basic diagnostic tools.
          </p>
          <p className={styles.lead}>
            LabLink bridges that gap. We are a circular-economy nonprofit connecting lab surplus to the communities
            that need it most — locally in New Haven and globally through health partners like Hospital Bethesda in
            Guatemala.
          </p>
        </div>
        <div className={styles.missionImageFrame}>
          <Image
            src="/home-mission-josh-seb-boxes.jpg"
            alt="Josh and Sebastian standing behind packed boxes for Hospital Bethesda at Yale University"
            width={1200}
            height={900}
            className={styles.missionImage}
          />
          <div className={styles.missionCaption}>
            Packing the first shipment to Hospital Bethesda, Quetzaltenango, Guatemala
          </div>
        </div>
      </section>

      <section className={styles.story} id="story">
        <span className={styles.sectionLabel}>Our Story</span>
        <h2 className={styles.sectionTitle}>From a Yale dorm to Guatemala.</h2>
        <p className={styles.lead}>Seven months. Zero institutional funding. All student-run.</p>

        <div className={styles.timeline}>
          {timelineItems.map((item) => (
            <article key={item.title} className={styles.timelineItem}>
              <div className={styles.timelineDate}>{item.date}</div>
              <div className={styles.timelineTitle}>{item.title}</div>
              <div className={styles.timelineBody}>{item.body}</div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.photoSection} id="photos">
        <div className={styles.photoHeading}>
          <span className={styles.sectionLabel}>In the Field</span>
          <h2 className={styles.sectionTitle}>The work, up close.</h2>
        </div>
        <div className={styles.photoGrid}>
          {photoItems.map((item) => (
            <figure
              key={item.caption}
              className={`${styles.photoCell}${item.tall ? ` ${styles.photoCellTall}` : ""}`}
            >
              <img src={item.src} alt={item.alt} className={styles.photoImage} />
              <figcaption className={styles.photoCaption}>{item.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.numbers} id="impact">
        <span className={`${styles.sectionLabel} ${styles.numbersLabel}`}>Impact by the numbers</span>
        <h2 className={styles.sectionTitle}>7 months. Zero funding. Real results.</h2>
        <div className={styles.numbersGrid}>
          {numberItems.map((item) => (
            <article key={item.label} className={styles.numberCard}>
              <div className={styles.numberValue}>{item.value}</div>
              <div className={styles.numberLabel}>{item.label}</div>
              <div className={styles.numberSubLabel}>{item.sublabel}</div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.team} id="team">
        <div>
          <span className={styles.sectionLabel}>Who We Are</span>
          <h2 className={styles.sectionTitle}>Yale students. Building something real.</h2>
          <p className={styles.lead}>
            LabLink is student-founded, student-run, and mission-driven. We believe the people closest to the problem
            are best placed to solve it.
          </p>
          <div className={styles.teamImageFrame}>
            <Image
              src="/josh-seb-with-faces.png"
              alt="The LabLink team"
              width={1200}
              height={900}
              className={styles.teamImage}
            />
          </div>
        </div>
        <div className={styles.teamCards}>
          {teamItems.map((item) => (
            <article
              key={item.name}
              className={`${styles.teamCard}${item.muted ? ` ${styles.teamCardMuted}` : ""}`}
            >
              <div className={`${styles.teamAvatar}${item.muted ? ` ${styles.teamAvatarMuted}` : ""}`}>
                {item.initials}
              </div>
              <div>
                <div className={styles.teamName}>{item.name}</div>
                <div className={styles.teamRole}>{item.role}</div>
                <div className={styles.teamBio}>{item.bio}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          Lab<span>Link</span>
        </div>
        <p>A Yale nonprofit · New Haven, CT · Founded 2024</p>
      </footer>
    </div>
  );
}
