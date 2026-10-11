import { api } from "@/services/api";
import type { ProvenanceDetails } from "@/types/ledger";

export const ledgerService = {
  /**
   * Fetches the immutable cryptographic provenance record for a produce listing.
   */
  async getProvenance(listingId: string): Promise<ProvenanceDetails> {
    const res = await api.get<{ data: ProvenanceDetails }>(`/ledger/${listingId}`);
    return res.data;
  },
};
