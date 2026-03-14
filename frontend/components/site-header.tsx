import Link from "next/link";

const navItems = [
  { href: "/listings", label: "Browse Equipment" },
  { href: "/donor", label: "Donor Dashboard" },
  { href: "/recipient", label: "Recipient Dashboard" },
  { href: "/admin", label: "Admin Panel" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link href="/" className="brand-mark">
          <span className="brand-mark-badge">LL</span>
          <span>
            <strong>LabLink</strong>
            <small>Managed Equipment Donation Marketplace</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/auth" className="button button-outline">
          Sign In / Verify
        </Link>
      </div>
    </header>
  );
}

