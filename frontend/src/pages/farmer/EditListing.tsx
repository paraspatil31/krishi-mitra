import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { listingService, type ListingFormData } from "@/services/listing.service";
import type { Listing } from "@/types/product";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ListingForm from "@/components/listings/ListingForm";
import Spinner from "@/components/common/Spinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import { FARMER_NAV } from "./navItems";

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { navigate("/farmer/listings"); return; }
    listingService
      .getListingById(id)
      .then(setListing)
      .catch((err) => setError(err instanceof Error ? err.message : "Listing not found."))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  async function handleSubmit(data: ListingFormData) {
    if (!id) return;
    await listingService.updateListing(id, data);
    navigate("/farmer/listings");
  }

  return (
    <DashboardLayout
      title="My Listings"
      subtitle="Manage your farm products"
      navItems={FARMER_NAV}
    >
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Edit Listing
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Update your product information.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && error && (
        <ErrorMessage message={error} />
      )}

      {!loading && !error && listing && (
        <ListingForm
          initialValues={{
            name: listing.name,
            category: listing.category,
            description: listing.description,
            price: listing.price,
            unit: listing.unit,
            quantity: listing.quantity,
            location: listing.location,
            harvestDate: listing.harvestDate,
            images: listing.images,
            status: listing.status === "sold_out" || listing.status === "archived"
              ? "draft"
              : listing.status,
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          cancelHref="/farmer/listings"
        />
      )}
    </DashboardLayout>
  );
}
