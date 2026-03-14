import { ListingCard } from "@/components/listing-card";
import { getPublicListings } from "@/lib/api";

export default async function ListingsPage() {
  const listings = await getPublicListings();

  return (
    <section className="page-section">
      <div className="shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">Public catalog</span>
            <h1>Browse approved equipment listings</h1>
            <p>
              Listings are visible publicly, but only verified recipient institutions can submit requests and only
              verified donor institutions can post equipment.
            </p>
          </div>
        </div>
        <div className="listing-grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  );
}

