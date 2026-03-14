import Link from "next/link";

import { getCurrentProfile } from "@/lib/api";

const navItems = [
  { href: "/listings", label: "Browse Equipment" },
  { href: "/donor", label: "Donor Dashboard" },
  { href: "/recipient", label: "Recipient Dashboard" },
  { href: "/admin", label: "Admin Panel" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const profile = await getCurrentProfile();
  const dashboardHref =
    profile?.user.role === "donor_lab"
      ? "/donor"
      : profile?.user.role === "recipient_institution"
        ? "/recipient"
        : profile?.user.role === "admin"
          ? "/admin"
          : "/auth";

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
        {profile ? (
          <div className="header-profile">
            <div className="header-profile-copy">
              <strong>{profile.institution.name}</strong>
              <small>{profile.user.role.replaceAll("_", " ")}</small>
            </div>
            <Link href={dashboardHref} className="button button-outline">
              Open dashboard
            </Link>
          </div>
        ) : (
          <Link href="/auth" className="button button-outline">
            Sign In / Verify
          </Link>
        )}
      </div>
    </header>
  );
}
