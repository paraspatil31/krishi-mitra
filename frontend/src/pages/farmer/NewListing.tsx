import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { listingService, type ListingFormData } from "@/services/listing.service";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ListingForm from "@/components/listings/ListingForm";
import { FARMER_NAV } from "./navItems";

export default function NewListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const titleParam = searchParams.get("title") || "";
  const qualityGradeParam = searchParams.get("qualityGrade") || "";
  const cleanGrade = qualityGradeParam.replace(/^Grade\s*/i, "").trim();

  const initialValues =
    titleParam || cleanGrade
      ? {
          name: titleParam,
          ...(cleanGrade ? { qualityGrade: cleanGrade } : {}),
        }
      : undefined;

  async function handleSubmit(data: ListingFormData) {
    if (!user) throw new Error("You must be logged in.");
    await listingService.createListing(data, { id: user.id, name: user.name });
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
          New Listing
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Add a new product to your farm marketplace.
        </p>
      </div>

      <ListingForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitLabel="Create Listing"
        cancelHref="/farmer/listings"
      />
    </DashboardLayout>
  );
}
