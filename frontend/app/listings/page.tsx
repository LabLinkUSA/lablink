import { PublicCatalogBrowser } from "@/components/public-catalog-browser";
import { getCurrentProfile, getPublicListings } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

export default async function ListingsPage() {
  const [profile, listings] = await Promise.all([getCurrentProfile(), getPublicListings()]);
  redirectAdminToDashboard(profile);

  return (
    <section className="page-section">
      <div className="shell">
        {listings.length > 0 ? (
          <PublicCatalogBrowser listings={listings} />
        ) : (
          <div className="empty-state">
            <h2>No listings yet</h2>
            <p>
              The public equipment catalog is empty right now. Listings will appear here after donors submit them and
              admins approve them for publication.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
