import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import ErrorMessage from "@/components/common/ErrorMessage";
import LocationPicker, { type VerifiedLocation } from "@/components/common/LocationPicker";
import type { ListingFormData } from "@/services/listing.service";
import type { ProductCategory } from "@/types/product";
import { mandiService } from "@/services/mandi.service";
import type { MandiBenchmark } from "@/types/mandi";

interface FormErrors {
  name?: string;
  category?: string;
  description?: string;
  price?: string;
  unit?: string;
  quantity?: string;
  location?: string;
  harvestDate?: string;
}

interface ListingFormProps {
  initialValues?: Partial<ListingFormData>;
  onSubmit: (data: ListingFormData) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
}

const CATEGORY_OPTIONS = [
  { value: "", label: "Select category" },
  { value: "vegetables", label: "Vegetables" },
  { value: "fruits", label: "Fruits" },
  { value: "grains", label: "Grains & Pulses" },
  { value: "dairy", label: "Dairy & Poultry" },
  { value: "spices", label: "Spices & Herbs" },
  { value: "organic", label: "Organic Produce" },
  { value: "other", label: "Other Agriculture" },
];

const UNIT_OPTIONS = [
  { value: "", label: "Select unit" },
  { value: "kg", label: "kg (kilogram)" },
  { value: "g", label: "g (gram)" },
  { value: "quintal", label: "quintal (100 kg)" },
  { value: "liter", label: "liter (L)" },
  { value: "piece", label: "piece" },
  { value: "bunch", label: "bunch" },
  { value: "dozen", label: "dozen" },
  { value: "crate", label: "crate" },
  { value: "bag", label: "bag" },
  { value: "ton", label: "ton" },
];

const QUALITY_OPTIONS = [
  { value: "A", label: "Grade A — Premium Quality (Direct Farm Gate)" },
  { value: "B", label: "Grade B — Standard Market Grade" },
  { value: "C", label: "Grade C — Processing / Economy Grade" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft — save without publishing" },
  { value: "active", label: "Active — visible to marketplace buyers" },
];

const SAMPLE_IMAGES: Record<string, string> = {
  Tomatoes: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
  Wheat: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80",
  Apples: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80",
  Milk: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
};

function validate(f: {
  name: string;
  category: string;
  description: string;
  price: string;
  unit: string;
  quantity: string;
  location: string;
  harvestDate: string;
}): FormErrors {
  const errors: FormErrors = {};
  if (!f.name.trim()) errors.name = "Product name is required.";
  else if (f.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
  else if (f.name.trim().length > 100) errors.name = "Name cannot exceed 100 characters.";

  if (!f.category) errors.category = "Please select a category.";

  if (!f.description.trim()) errors.description = "Description is required.";
  else if (f.description.trim().length < 5)
    errors.description = "Description must be at least 5 characters.";

  const price = parseFloat(f.price);
  if (!f.price) errors.price = "Price is required.";
  else if (isNaN(price) || price <= 0) errors.price = "Enter a valid price greater than ₹0.";
  else if (price > 1000000) errors.price = "Price cannot exceed ₹10,00,000.";

  if (!f.unit) errors.unit = "Please select a unit of measurement.";

  const qty = parseInt(f.quantity, 10);
  if (!f.quantity) errors.quantity = "Quantity is required.";
  else if (isNaN(qty) || qty <= 0) errors.quantity = "Enter a valid quantity (at least 1).";
  else if (qty > 500000) errors.quantity = "Quantity cannot exceed 5,00,000.";

  if (!f.location.trim()) errors.location = "Farm location is required. You can use GPS or search above.";

  if (!f.harvestDate) errors.harvestDate = "Harvest date is required.";

  return errors;
}

export default function ListingForm({
  initialValues,
  onSubmit,
  submitLabel,
  cancelHref = "/farmer/listings",
}: ListingFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split("T")[0];
  const [name, setName] = useState(initialValues?.name ?? "");
  const [category, setCategory] = useState<ProductCategory | "">(initialValues?.category ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [price, setPrice] = useState(String(initialValues?.price ?? ""));
  const [unit, setUnit] = useState(initialValues?.unit ?? "kg");
  const [quantity, setQuantity] = useState(String(initialValues?.quantity ?? ""));
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [harvestDate, setHarvestDate] = useState(initialValues?.harvestDate ?? todayStr);
  const [qualityGrade, setQualityGrade] = useState((initialValues as any)?.qualityGrade ?? "A");
  const [imageUrl, setImageUrl] = useState(initialValues?.images?.[0] ?? "");
  const [status, setStatus] = useState<"draft" | "active">(initialValues?.status ?? "active");

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [benchmark, setBenchmark] = useState<MandiBenchmark | null>(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  // Pre-fill crop name and quality grade if coming from Crop Doctor inspection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const titleParam = params.get("title");
      const gradeParam = params.get("qualityGrade");
      if (titleParam && !name) {
        setName(titleParam);
      }
      if (gradeParam) {
        const clean = gradeParam.replace("Grade ", "").trim();
        if (["A", "B", "C"].includes(clean)) {
          setQualityGrade(clean);
        }
      }
    }
  }, []);

  // Auto-fetch APMC Mandi price benchmark when user types crop title
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 3) {
      setBenchmark(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingBenchmark(true);
      try {
        const b = await mandiService.getBenchmark(trimmed);
        setBenchmark(b);
      } catch {
        setBenchmark(null);
      } finally {
        setLoadingBenchmark(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [name]);

  function clearField(field: keyof FormErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleLocationSelected(loc: VerifiedLocation) {
    setLocation(loc.displayName);
    clearField("location");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError("");

    const raw = { name, category, description, price, unit, quantity, location, harvestDate };
    const fieldErrors = validate(raw);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setApiError("Please resolve the highlighted fields before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const formData: ListingFormData = {
      name: name.trim(),
      category: category as ProductCategory,
      description: description.trim(),
      price: parseFloat(price),
      unit,
      quantity: parseInt(quantity, 10),
      location: location.trim(),
      harvestDate,
      status,
      images: imageUrl.trim() ? [imageUrl.trim()] : [],
      qualityGrade,
    } as any;

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {apiError && <ErrorMessage message={apiError} />}

      {/* Basic Info */}
      <fieldset className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <legend className="px-2 text-base font-bold text-gray-900">{t("listing.productInfo")}</legend>

        <Input
          label={t("listing.cropName")}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearField("name");
          }}
          error={errors.name}
          placeholder="e.g. Organic Sharbati Wheat, Fresh Alphonso Mangoes"
          hint="Clear, descriptive crop name recognized by buyers"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Select
            label={t("listing.category")}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as ProductCategory);
              clearField("category");
            }}
            error={errors.category}
            options={CATEGORY_OPTIONS}
            required
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-900">
                {t("products.qualityGrade", "Quality Grade")}
              </label>
              <Link
                to="/crop-doctor"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
              >
                <span>🔬</span> {t("listing.inspectWithAi", "Inspect with AI")}
              </Link>
            </div>
            <Select
              value={qualityGrade}
              onChange={(e) => setQualityGrade(e.target.value)}
              options={QUALITY_OPTIONS}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs sm:text-sm font-semibold text-gray-800">
              {t("listing.description")}
            </label>
            <span className="text-[11px] text-gray-500">
              {description.length}/2000 characters
            </span>
          </div>
          <Textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearField("description");
            }}
            error={errors.description}
            rows={3}
            placeholder="Describe freshness, farming practices (e.g. pesticide-free, drip-irrigated), and lot details..."
            required
          />
        </div>

        {/* Photo URL & Sample Picker */}
        <div>
          <Input
            label={t("listing.imageUrl")}
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/... or paste image URL"
            hint="Paste any web image URL or choose a high-resolution sample below"
          />

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Quick Sample:</span>
            {Object.entries(SAMPLE_IMAGES).map(([title, url]) => (
              <button
                key={title}
                type="button"
                onClick={() => setImageUrl(url)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
              >
                + {title}
              </button>
            ))}
          </div>

          {imageUrl && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
              <img
                src={imageUrl}
                alt="Preview"
                className="h-16 w-16 rounded-lg object-cover bg-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' font-size='10' dominant-baseline='middle' text-anchor='middle' fill='%23aaa'%3EInvalid%3C/text%3E%3C/svg%3E";
                }}
              />
              <span className="text-xs text-emerald-800 font-medium">Image preview active</span>
            </div>
          )}
        </div>
      </fieldset>

      {/* Pricing & Inventory */}
      <fieldset className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <legend className="px-2 text-base font-bold text-gray-900">{t("listing.pricingInventory")}</legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            label={t("listing.pricePerUnit")}
            type="number"
            min="0.5"
            step="0.01"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              clearField("price");
            }}
            error={errors.price}
            placeholder="e.g. 45.00"
            hint="Price in Indian Rupees (₹)"
            required
          />

          <Select
            label={t("listing.unit")}
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              clearField("unit");
            }}
            error={errors.unit}
            options={UNIT_OPTIONS}
            required
          />
        </div>

        {/* Mandi Benchmark Price Guidance */}
        {loadingBenchmark && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs text-gray-500 flex items-center gap-2">
            <span className="animate-spin">🔄</span>
            <span>Checking live APMC mandi benchmarks for {name}...</span>
          </div>
        )}

        {benchmark && !loadingBenchmark && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white p-4 text-xs text-emerald-900 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-xl shrink-0">📈</span>
              <div className="space-y-0.5">
                <p className="font-bold text-gray-900">
                  APMC Benchmark:{" "}
                  <span className="text-emerald-800 font-extrabold text-sm">
                    ₹{benchmark.suggestedPricePerKg}/kg
                  </span>
                  {benchmark.modalPricePerQuintal && (
                    <span className="text-gray-500 font-normal ml-1">
                      (₹{benchmark.modalPricePerQuintal}/quintal modal)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-gray-500">
                  Based on official {benchmark.marketName} Mandi Yard ({benchmark.district}) clearing rates
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (unit === "quintal" && benchmark.modalPricePerQuintal) {
                  setPrice(String(benchmark.modalPricePerQuintal));
                } else {
                  setPrice(String(benchmark.suggestedPricePerKg));
                }
                clearField("price");
              }}
              className="shrink-0 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              {t("listing.useMandiRate")} (₹{unit === "quintal" && benchmark.modalPricePerQuintal ? benchmark.modalPricePerQuintal : benchmark.suggestedPricePerKg})
            </button>
          </div>
        )}

        <Input
          label={t("listing.availableQuantity")}
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            clearField("quantity");
          }}
          error={errors.quantity}
          placeholder="e.g. 100"
          hint={`Total available ${unit || "units"} ready for dispatch`}
          required
        />
      </fieldset>

      {/* Location & Harvest with OpenStreetMap Verification */}
      <fieldset className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <legend className="px-2 text-base font-bold text-gray-900">{t("listing.originHarvest")}</legend>

        <LocationPicker
          initialLocation={location}
          onLocationSelected={handleLocationSelected}
          label="Farm Location (OpenStreetMap Geocoded &amp; Verified)"
          placeholder="Type your village, taluka, town or district (e.g. Niphad, Nashik)..."
        />
        {errors.location && (
          <p className="text-xs text-red-600 font-medium">{errors.location}</p>
        )}

        <Input
          label={t("products.harvestDate", "Harvest Date")}
          type="date"
          value={harvestDate}
          onChange={(e) => {
            setHarvestDate(e.target.value);
            clearField("harvestDate");
          }}
          error={errors.harvestDate}
          hint="Batch harvest date recorded into the immutable provenance ledger"
          required
        />
      </fieldset>

      {/* Visibility */}
      <fieldset className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <legend className="px-2 text-base font-bold text-gray-900">{t("listing.publicationStatus")}</legend>

        <div className="space-y-2">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                status === opt.value
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="status"
                value={opt.value}
                checked={status === opt.value}
                onChange={() => setStatus(opt.value as "draft" | "active")}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-800">
                {opt.value === "draft" ? t("listing.draftOption") : t("listing.activeOption")}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(cancelHref)}
          disabled={submitting}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="primary" loading={submitting}>
          {submitLabel || t("listing.saveListing")}
        </Button>
      </div>
    </form>
  );
}
