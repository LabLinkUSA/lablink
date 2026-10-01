import styles from "./app-footer.module.css";

export function AppFooter() {
  return (
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
  );
}
