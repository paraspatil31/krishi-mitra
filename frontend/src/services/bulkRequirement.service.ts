import { api } from "./api";
import { BulkRequirement, CreateBulkRequirementInput, BulkRequirementStatus, SubmitQuotationInput } from "../types/bulkRequirement";

export const bulkRequirementService = {
  /**
   * Create a new bulk requirement / RFQ
   */
  async createRequirement(data: CreateBulkRequirementInput): Promise<BulkRequirement> {
    const res = await api.post<{ data: BulkRequirement }>("/bulk-requirements", data);
    return res.data;
  },

  /**
   * Get requirements created by the logged-in buyer
   */
  async getMyRequirements(status?: BulkRequirementStatus): Promise<BulkRequirement[]> {
    const query = status ? `?status=${status}` : "";
    const res = await api.get<{ data: BulkRequirement[] }>(`/bulk-requirements/my${query}`);
    return res.data || [];
  },

  /**
   * Get all open requirements (available for farmers and business buyers)
   */
  async getOpenRequirements(params?: { district?: string; product?: string }): Promise<BulkRequirement[]> {
    const query = new URLSearchParams();
    if (params?.district) query.set("district", params.district);
    if (params?.product) query.set("product", params.product);
    const queryString = query.toString();
    const res = await api.get<{ data: BulkRequirement[] }>(`/bulk-requirements/open${queryString ? `?${queryString}` : ""}`);
    return res.data || [];
  },

  /**
   * Submit a farmer quotation for an open bulk requirement
   */
  async submitQuotation(id: string, data: SubmitQuotationInput): Promise<BulkRequirement> {
    const res = await api.post<{ data: BulkRequirement }>(`/bulk-requirements/${id}/quote`, data);
    return res.data;
  },

  /**
   * Get single requirement by ID
   */
  async getRequirementById(id: string): Promise<BulkRequirement> {
    const res = await api.get<{ data: BulkRequirement }>(`/bulk-requirements/${id}`);
    return res.data;
  },

  /**
   * Update status of requirement
   */
  async updateStatus(id: string, status: BulkRequirementStatus): Promise<BulkRequirement> {
    const res = await api.patch<{ data: BulkRequirement }>(`/bulk-requirements/${id}/status`, { status });
    return res.data;
  },

  /**
   * Delete a requirement
   */
  async deleteRequirement(id: string): Promise<void> {
    await api.delete(`/bulk-requirements/${id}`);
  },
};

export default bulkRequirementService;
