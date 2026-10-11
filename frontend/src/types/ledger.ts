export interface ProvenanceDetails {
  id: string;
  listingId: string;
  farmerId: string;
  farmerName: string;
  cropName: string;
  category: string;
  quantity: number;
  unit: string;
  harvestDate: string;
  qualityTag: string;
  txHash: string;
  blockNumber: number;
  network: string;
  district?: string;
  verifiedAt: string;
  verificationUrl: string;
  explorerUrl: string;
  isAuthentic: boolean;
}
