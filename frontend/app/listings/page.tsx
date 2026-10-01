import { PublicCatalogBrowser } from "@/components/public-catalog-browser";
import styles from "@/components/catalog/catalog.module.css";
import { EmptyState, Highlight, PageHeader } from "@/components/ui";
import { getCurrentProfile, getPublicListings } from "@/lib/api";

export default async function ListingsPage() {
  const [, listings] = await Promise.all([getCurrentProfile(), getPublicListings()]);

  if (listings.length > 0) {
    return <PublicCatalogBrowser listings={listings} />;
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <PageHeader
          variant="public"
          eyebrow="Equipment catalog"
          title={
            <>
              Inventory <Highlight>Catalog</Highlight>
            </>
          }
        />
        <div data-catalog-empty>
          <EmptyState
            variant="gate"
            title="No listings yet"
            lead="The public equipment catalog is empty right now. Listings will appear here after donors submit them and admins approve them for publication."
          />
        </div>
      </div>
    </section>
  );
}
