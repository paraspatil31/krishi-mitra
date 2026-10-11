import { useState, type FormEvent } from "react";
import { BulkRequirement } from "@/types/bulkRequirement";
import bulkRequirementService from "@/services/bulkRequirement.service";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ErrorMessage from "@/components/common/ErrorMessage";

interface FarmerQuotationModalProps {
  isOpen: boolean;
  requirement: BulkRequirement | null;
  onClose: () => void;
  onQuoted: () => void;
}

export default function FarmerQuotationModal({
  isOpen,
  requirement,
  onClose,
  onQuoted,
}: FarmerQuotationModalProps) {
  if (!isOpen || !requirement) return null;

  const [offeredPrice, setOfferedPrice] = useState(
    requirement.targetPricePerUnit ? String(requirement.targetPricePerUnit) : ""
  );
  const [availableQty, setAvailableQty] = useState(String(requirement.quantity));
  const [readyDate, setReadyDate] = useState(requirement.requiredByDate || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const price = parseFloat(offeredPrice);
    const qty = parseFloat(availableQty);
    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid price per unit");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid available quantity");
      return;
    }
    if (!readyDate) {
      setError("Please select when the harvest/supply will be ready");
      return;
    }

    setLoading(true);
    try {
      await bulkRequirementService.submitQuotation(requirement!.id, {
        offeredPricePerUnit: price,
        availableQuantity: qty,
        availableDate: readyDate,
        notes: notes.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onQuoted();
        onClose();
        setSuccess(false);
      }, 900);
    } catch (err: any) {
      setError(err.message || "Failed to submit quotation");
    } finally {
      setLoading(false);
    }
  }

  const buyerProfile = typeof requirement.buyerId === "object" ? requirement.buyerId : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-[#0d261a] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl border border-emerald-400/30">
              🌾
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Submit Producer Quotation</h3>
              <p className="text-xs text-emerald-200">
                Direct commercial bid to {buyerProfile?.businessProfile?.businessName || buyerProfile?.name || "Verified Buyer"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white rounded-full p-1.5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Demand Overview Card */}
        <div className="p-5 bg-emerald-50/70 border-b border-emerald-100 text-xs text-emerald-950 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-gray-900">{requirement.product}</span>
            <span className="font-black text-emerald-800 text-sm">
              Demand: {requirement.quantity} {requirement.unit.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-600">
            📍 Destination: <strong>{requirement.deliveryLocation.address}, {requirement.deliveryLocation.district}</strong>
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
            <span>Required By: <strong>{requirement.requiredByDate}</strong></span>
            {requirement.targetPricePerUnit && (
              <span>Buyer Target: <strong>₹{requirement.targetPricePerUnit.toLocaleString()} / {requirement.unit}</strong></span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorMessage message={error} />}
          {success && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold">
              ✓ Quotation sent successfully! The buyer has been notified.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label={`Your Price per ${requirement.unit} (₹)`}
                type="number"
                step="any"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(e.target.value)}
                placeholder="e.g. 23500"
                required
              />
            </div>
            <div>
              <Input
                label={`Available Quantity (${requirement.unit})`}
                type="number"
                step="any"
                value={availableQty}
                onChange={(e) => setAvailableQty(e.target.value)}
                placeholder="e.g. 15"
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Harvest / Delivery Readiness Date"
              type="date"
              value={readyDate}
              onChange={(e) => setReadyDate(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Producer Notes & Quality Specs
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Freshly harvested from Nashik farm. Packed in ventilated 50kg bags. Can arrange tempo dispatch."
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 rounded-xl shadow-md"
            >
              Submit Quotation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
