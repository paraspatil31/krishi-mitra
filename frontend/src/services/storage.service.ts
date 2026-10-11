import { api } from "./api";
import type { StorageFacility, StorageFilterParams } from "@/types/storage";

export const storageService = {
  async getFacilities(params: StorageFilterParams = {}): Promise<StorageFacility[]> {
    const searchParams = new URLSearchParams();
    if (params.district) searchParams.set("district", params.district);
    if (params.type) searchParams.set("type", params.type);
    if (params.search) searchParams.set("search", params.search);
    if (params.lat !== undefined && params.lng !== undefined) {
      searchParams.set("lat", params.lat.toString());
      searchParams.set("lng", params.lng.toString());
    }
    if (params.radiusKm) searchParams.set("radiusKm", params.radiusKm.toString());

    const qs = searchParams.toString();
    const url = `/storage${qs ? `?${qs}` : ""}`;
    const res = await api.get<{ data: StorageFacility[]; count: number }>(url);
    return res.data || [];
  },

  async getFacilityById(id: string): Promise<StorageFacility> {
    const res = await api.get<{ data: StorageFacility }>(`/storage/${id}`);
    return res.data;
  },
};
