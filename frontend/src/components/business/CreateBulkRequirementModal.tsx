import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { CreateBulkRequirementInput, BulkUnit } from "@/types/bulkRequirement";
import bulkRequirementService from "@/services/bulkRequirement.service";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ErrorMessage from "@/components/common/ErrorMessage";

interface CreateBulkRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateBulkRequirementModal({ isOpen, onClose, onCreated }: CreateBulkRequirementModalProps) {
  const { user } = useAuth();

  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<BulkUnit>("tons");
  const [targetPrice, setTargetPrice] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [address, setAddress] = useState(user?.businessProfile?.businessAddress || "");
  const [district, setDistrict] = useState(user?.district || "Pune");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!product.trim()) {
      setError("Product or commodity name is required");
      return;
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setError("Please enter a valid positive quantity");
      return;
    }
    if (!requiredDate) {
      setError("Please specify by when the shipment is required");
      return;
    }
    if (!address.trim() || !district.trim()) {
      setError("Delivery address and district are required");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateBulkRequirementInput = {
        product: product.trim(),
        quantity: numQty,
        unit,
        targetPricePerUnit: targetPrice ? parseFloat(targetPrice) : undefined,
        requiredByDate: requiredDate,
        deliveryLocation: {
          address: address.trim(),
          district: district.trim(),
          state: "Maharashtra",
          pincode: pincode.trim() || undefined,
        },
        notes: notes.trim() || undefined,
      };

      await bulkRequirementService.createRequirement(payload);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit bulk procurement requirement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-[#0d261a] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl border border-emerald-400/30">
              📋
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Post Bulk Procurement RFQ</h3>
              <p className="text-xs text-emerald-200">
                Broadcast your commercial volume demand directly to verified producer farmers
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && <ErrorMessage message={error} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Produce / Crop Required"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Nashik Red Onion (Grade A)"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  label="Quantity"
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 10"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as BulkUnit)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="tons">Tons (1,000 kg)</option>
                  <option value="quintals">Quintals (100 kg)</option>
                  <option value="crates">Crates (~25 kg)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Target Price Per Unit (₹) (Optional)"
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 24000 per ton"
                hint="Desired price ceiling or market benchmark"
              />
            </div>
            <div>
              <Input
                label="Required By Date"
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Delivery Destination / Hub"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Central Warehouse, Gat No 112"
                required
              />
            </div>
            <div>
              <Input
                label="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Pune"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Quality Specs / Packaging Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Clean sorted, dry skin, 45mm+ size, packed in 50kg ventilated mesh bags. Unloading available at site."
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
              Broadcast RFQ
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
