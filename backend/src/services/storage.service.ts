import { StorageFacility } from "../models/StorageFacility";

const SEED_STORAGE_FACILITIES = [
  {
    name: "Nashik Agri Cold Chain & Multi-Crop Packhouse",
    type: "cold_storage",
    district: "Nashik",
    state: "Maharashtra",
    address: "Plot 42-45, MIDC Ambad, Nashik - 422010",
    pincode: "422010",
    location: {
      type: "Point",
      coordinates: [73.7423, 19.9575], // Nashik
    },
    totalCapacity: 3500,
    availableCapacity: 1200,
    capacityUpdatedAt: new Date(),
    temperatureRange: "0°C to 4°C (Grapes, Apples, Pomegranate)",
    pricePerTonPerMonth: 850,
    amenities: [
      "Pre-Cooling Chambers",
      "Humidity Control (90-95%)",
      "24/7 CCTV Surveillance",
      "Loading Bay & Forklifts",
      "WDRA Registered",
      "Transit Insurance Covered",
    ],
    contactPhone: "+91 98220 12345",
    contactEmail: "nashik.coldchain@krishibazaar.in",
    operatingHours: "06:00 AM - 10:00 PM",
    wdraRegistered: true,
    isActive: true,
  },
  {
    name: "Lasalgaon APMC Modern Onion Storage Hub",
    type: "dry_warehouse",
    district: "Nashik",
    state: "Maharashtra",
    address: "Near APMC Yard, Station Road, Lasalgaon - 422306",
    pincode: "422306",
    location: {
      type: "Point",
      coordinates: [74.2285, 20.1476], // Lasalgaon
    },
    totalCapacity: 6000,
    availableCapacity: 2450,
    capacityUpdatedAt: new Date(),
    temperatureRange: "Ambient Ventilated (Modified Atmosphere for Onion & Garlic)",
    pricePerTonPerMonth: 450,
    amenities: [
      "Forced Air Ventilation",
      "Rodent & Pest Proofing",
      "Digital Weighbridge",
      "WDRA Warehouse Receipts Eligible",
      "Direct Rail Siding Connection",
    ],
    contactPhone: "+91 98231 67890",
    contactEmail: "lasalgaon.hub@krishibazaar.in",
    operatingHours: "07:00 AM - 08:00 PM",
    wdraRegistered: true,
    isActive: true,
  },
  {
    name: "Baramati Mega Agro Logistics Park",
    type: "cold_storage",
    district: "Pune",
    state: "Maharashtra",
    address: "Agro High-Tech Zone, MIDC Baramati, Pune - 413133",
    pincode: "413133",
    location: {
      type: "Point",
      coordinates: [74.5815, 18.1519], // Baramati
    },
    totalCapacity: 4500,
    availableCapacity: 1800,
    capacityUpdatedAt: new Date(),
    temperatureRange: "0°C to 12°C (Multi-Chamber Dairy, Fruit & Veg)",
    pricePerTonPerMonth: 900,
    amenities: [
      "Independent Temperature Chambers",
      "Banana Ripening Units",
      "Refrigerated Truck Docking",
      "Backup Power Generation",
      "FSSAI & WDRA Certified",
    ],
    contactPhone: "+91 98224 55432",
    contactEmail: "baramati.agro@krishibazaar.in",
    operatingHours: "24 Hours Active Operations",
    wdraRegistered: true,
    isActive: true,
  },
  {
    name: "Pune Hadapsar Integrated Cold Vault",
    type: "cold_storage",
    district: "Pune",
    state: "Maharashtra",
    address: "Survey No. 128, Gadital, Hadapsar, Pune - 411028",
    pincode: "411028",
    location: {
      type: "Point",
      coordinates: [73.9312, 18.5089], // Pune
    },
    totalCapacity: 2800,
    availableCapacity: 620,
    capacityUpdatedAt: new Date(),
    temperatureRange: "-2°C to 5°C (High-Perishables & Exotic Greens)",
    pricePerTonPerMonth: 1100,
    amenities: [
      "Rapid Blast Freezing",
      "Ozone Sanitation",
      "Online Stock Tracking",
      "Metro Delivery Fleet Integration",
      "24/7 Security",
    ],
    contactPhone: "+91 98229 88776",
    contactEmail: "pune.vault@krishibazaar.in",
    operatingHours: "06:00 AM - 11:00 PM",
    wdraRegistered: true,
    isActive: true,
  },
  {
    name: "Nagpur Citrus & Orange Controlled Atmosphere Reserve",
    type: "ripening_chamber",
    district: "Nagpur",
    state: "Maharashtra",
    address: "Kalamna Market Road, East Nagpur - 440026",
    pincode: "440026",
    location: {
      type: "Point",
      coordinates: [79.1365, 21.1712], // Nagpur
    },
    totalCapacity: 4000,
    availableCapacity: 2100,
    capacityUpdatedAt: new Date(),
    temperatureRange: "4°C to 8°C (Citrus, Sweet Orange, Mango)",
    pricePerTonPerMonth: 750,
    amenities: [
      "Ethylene Gas Ripening Chambers",
      "Electronic Grading & Sorting Lines",
      "Corrugated Box Packaging Unit",
      "NHB Subsidy Approved",
      "CCTV Surveillance",
    ],
    contactPhone: "+91 98235 44321",
    contactEmail: "nagpur.citrus@krishibazaar.in",
    operatingHours: "07:00 AM - 09:00 PM",
    wdraRegistered: true,
    isActive: true,
  },
  {
    name: "Sangli Turmeric, Raisin & Grain Modern Silo",
    type: "silo",
    district: "Sangli",
    state: "Maharashtra",
    address: "Kupwad Industrial Area, Sangli - 416436",
    pincode: "416436",
    location: {
      type: "Point",
      coordinates: [74.6189, 16.8524], // Sangli
    },
    totalCapacity: 8000,
    availableCapacity: 3400,
    capacityUpdatedAt: new Date(),
    temperatureRange: "Moisture & Nitrogen Purged Dry Grain Storage",
    pricePerTonPerMonth: 400,
    amenities: [
      "Automated Temperature Cables",
      "Nitrogen Inerting Preservation",
      "Grain Cleaning & De-stoning",
      "WDRA Electronic Negotiable Receipts (e-NWR)",
    ],
    contactPhone: "+91 98226 33211",
    contactEmail: "sangli.silos@krishibazaar.in",
    operatingHours: "07:00 AM - 07:00 PM",
    wdraRegistered: true,
    isActive: true,
  },
];

export async function ensureStorageSeedData(): Promise<void> {
  try {
    const count = await StorageFacility.countDocuments();
    if (count === 0) {
      await StorageFacility.insertMany(SEED_STORAGE_FACILITIES);
    }
  } catch (err) {
    console.error("Failed to seed initial storage facilities:", err);
  }
}
