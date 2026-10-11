import { Market, IMarket, MarketType } from "../models/Market";

export interface NearbyMarketQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  marketType?: MarketType;
  commodity?: string;
  district?: string;
  search?: string;
  enamOnly?: boolean;
}

export interface MarketWithDistance extends IMarket {
  distanceKm?: number;
}

const SEED_MARKETS = [
  {
    name: "Pune APMC Market Yard (Gultekdi)",
    code: "MH-PUN-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Pune",
    state: "Maharashtra",
    address: "Gultekdi Market Yard, Shankarsheth Road, Pune",
    pincode: "411037",
    location: {
      type: "Point" as const,
      coordinates: [73.8687, 18.4907], // [lng, lat]
    },
    operatingHours: "05:00 AM - 03:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    majorCommodities: ["Tomato", "Onion", "Potato", "Pomegranate", "Banana", "Ginger", "Green Chilli"],
    facilities: [
      "e-NAM Online Auction",
      "Electronic Weighbridge",
      "Cold Storage (500 MT)",
      "Soil Testing Center",
      "Farmer Kisan Bhawan (Dormitory)",
      "Banking / ATM (SBI)",
      "Dispute Arbitration Cell",
    ],
    contactPhone: "+91-20-24268100",
    contactEmail: "apmc.pune@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 1420,
    isActive: true,
  },
  {
    name: "Lasalgaon APMC Onion Yard",
    code: "MH-NSK-02",
    marketType: "apmc_mandi" as MarketType,
    district: "Nashik",
    state: "Maharashtra",
    address: "Vinchur Road, Lasalgaon, Taluka Niphad",
    pincode: "422306",
    location: {
      type: "Point" as const,
      coordinates: [74.2255, 20.1444],
    },
    operatingHours: "08:00 AM - 06:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    majorCommodities: ["Onion (Red/Pol)", "Onion (Summer/Garva)", "Maize", "Wheat", "Soyabean"],
    facilities: [
      "e-NAM Trading",
      "Asia's Largest Onion Auction Platform",
      "Multi-bay Weighbridges",
      "Moisture Testing Kiosks",
      "Kisan Rest House",
      "Direct Rail Rake Loading Yard",
    ],
    contactPhone: "+91-2550-266042",
    contactEmail: "apmc.lasalgaon@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 980,
    isActive: true,
  },
  {
    name: "Nashik APMC (Dindori Road)",
    code: "MH-NSK-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Nashik",
    state: "Maharashtra",
    address: "Panchavati, Dindori Road, Nashik",
    pincode: "422003",
    location: {
      type: "Point" as const,
      coordinates: [73.7997, 20.0212],
    },
    operatingHours: "06:00 AM - 04:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    majorCommodities: ["Tomato", "Grapes", "Cabbage", "Cauliflower", "Capsicum", "Pomegranate"],
    facilities: [
      "e-NAM Auction Platform",
      "Cold Storage & Ripening Units",
      "Pack-house Facilities",
      "Digital Electronic Scales",
      "Farmer Canteen",
    ],
    contactPhone: "+91-253-2512345",
    contactEmail: "apmc.nashik@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 1120,
    isActive: true,
  },
  {
    name: "Vashi APMC (Navi Mumbai Wholesale Market)",
    code: "MH-THN-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Thane",
    state: "Maharashtra",
    address: "Sector 19, Vashi, Navi Mumbai",
    pincode: "400705",
    location: {
      type: "Point" as const,
      coordinates: [73.0033, 19.076],
    },
    operatingHours: "04:00 AM - 02:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    majorCommodities: ["Mango (Alphonso)", "Onion", "Potato", "Apple", "Rice", "Pulses", "Spices"],
    facilities: [
      "Multi-terminal Wholesale Yard",
      "Export Quality Inspection Lab",
      "High-capacity Cold Chain Hub",
      "Heavy Truck Parking & Weighbridges",
      "Electronic e-NAM Clearing Terminal",
    ],
    contactPhone: "+91-22-27888000",
    contactEmail: "apmc.vashi@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 2350,
    isActive: true,
  },
  {
    name: "Kolhapur Shahu Chhatrapati APMC",
    code: "MH-KOP-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Kolhapur",
    state: "Maharashtra",
    address: "Laxmipuri, Near Shahupuri, Kolhapur",
    pincode: "416002",
    location: {
      type: "Point" as const,
      coordinates: [74.2384, 16.6974],
    },
    operatingHours: "07:00 AM - 05:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    majorCommodities: ["Jaggery (Kolhapuri Gur)", "Sugarcane", "Soyabean", "Ginger", "Turmeric"],
    facilities: [
      "e-NAM Enabled",
      "GI Tagged Jaggery Auction Hall",
      "Purity Testing Lab",
      "Automatic Grading Conveyors",
      "Warehouse (10,000 MT)",
    ],
    contactPhone: "+91-231-2651441",
    contactEmail: "apmc.kolhapur@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 840,
    isActive: true,
  },
  {
    name: "Baramati APMC Krishi Bajar",
    code: "MH-PUN-02",
    marketType: "apmc_mandi" as MarketType,
    district: "Pune",
    state: "Maharashtra",
    address: "MIDC Area, Bhigwan Road, Baramati",
    pincode: "413102",
    location: {
      type: "Point" as const,
      coordinates: [74.5815, 18.1517],
    },
    operatingHours: "06:30 AM - 03:30 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    majorCommodities: ["Sugarcane", "Grapes", "Pomegranate", "Maize", "Dairy Fodder", "Tomato"],
    facilities: [
      "e-NAM Auctioning",
      "Hi-tech Quality Assay Lab",
      "Cold Storage & Pre-cooling",
      "Precision Weighing Bridges",
      "Farmer Training Centre (KVK Linked)",
    ],
    contactPhone: "+91-2112-243555",
    contactEmail: "apmc.baramati@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 620,
    isActive: true,
  },
  {
    name: "Sangli Turmeric & Spices Market Yard",
    code: "MH-SAN-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Sangli",
    state: "Maharashtra",
    address: "Market Yard, Sangli-Miraj Road, Sangli",
    pincode: "416416",
    location: {
      type: "Point" as const,
      coordinates: [74.582, 16.8524],
    },
    operatingHours: "08:00 AM - 05:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    majorCommodities: ["Turmeric (Haldi)", "Raisins (Bedana)", "Soyabean", "Jowar", "Maize"],
    facilities: [
      "e-NAM Trading Hub",
      "India's Major Turmeric Exchange",
      "Curcumin Quality Testing Lab",
      "Cold Storage for Dry Fruits & Raisins",
      "Licensed Commission Agent Kiosks",
    ],
    contactPhone: "+91-233-2374020",
    contactEmail: "apmc.sangli@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 770,
    isActive: true,
  },
  {
    name: "Solapur APMC Siddheshwar Yard",
    code: "MH-SOL-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Solapur",
    state: "Maharashtra",
    address: "Siddheshwar Peth, Solapur",
    pincode: "413001",
    location: {
      type: "Point" as const,
      coordinates: [75.9064, 17.6599],
    },
    operatingHours: "07:00 AM - 04:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    majorCommodities: ["Pomegranate (Bhagwa)", "Jowar (Maldandi)", "Onion", "Pulses (Tur/Chana)"],
    facilities: [
      "e-NAM Auction",
      "Pomegranate Export Sorting Shed",
      "Grain Silos",
      "Electronic Weighbridges",
      "Farmer Rest House",
    ],
    contactPhone: "+91-217-2722100",
    contactEmail: "apmc.solapur@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 590,
    isActive: true,
  },
  {
    name: "Ahmednagar Krishi Utpanna Bajar Samiti",
    code: "MH-AHM-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Ahmednagar",
    state: "Maharashtra",
    address: "Nepti Sub Yard, Kalyan Road, Ahmednagar",
    pincode: "414005",
    location: {
      type: "Point" as const,
      coordinates: [74.7037, 19.0948],
    },
    operatingHours: "06:30 AM - 04:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    majorCommodities: ["Onion", "Soyabean", "Bajra", "Wheat", "Pomegranate", "Custard Apple"],
    facilities: [
      "e-NAM Platform",
      "Nepti Modern Onion Sub-yard",
      "Electronic Auction Hall",
      "Soil & Nutrient Testing Kiosk",
      "Weighbridges",
    ],
    contactPhone: "+91-241-2415200",
    contactEmail: "apmc.ahmednagar@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 810,
    isActive: true,
  },
  {
    name: "Nagpur Kalamna Grain & Cotton Market",
    code: "MH-NAG-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Nagpur",
    state: "Maharashtra",
    address: "Kalamna Market, Kamptee Road, Nagpur",
    pincode: "440026",
    location: {
      type: "Point" as const,
      coordinates: [79.1378, 21.1702],
    },
    operatingHours: "07:00 AM - 05:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    majorCommodities: ["Orange (Nagpur Santra)", "Cotton", "Soyabean", "Tur (Pigeon Pea)", "Paddy/Rice"],
    facilities: [
      "e-NAM Integrated",
      "Central India Citrus Packhouse & Cold Storage",
      "Cotton Quality Testing Center",
      "Multi-commodity Grain Warehouses",
      "Direct Highway Truck Terminus",
    ],
    contactPhone: "+91-712-2680250",
    contactEmail: "apmc.nagpur@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 1290,
    isActive: true,
  },
  {
    name: "Amravati Cotton & Grain APMC",
    code: "MH-AMR-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Amravati",
    state: "Maharashtra",
    address: "Cotton Market Road, Amravati",
    pincode: "444601",
    location: {
      type: "Point" as const,
      coordinates: [77.7523, 20.9374],
    },
    operatingHours: "08:00 AM - 04:30 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    majorCommodities: ["Cotton (Kapas)", "Soyabean", "Tur", "Gram (Chana)", "Orange"],
    facilities: [
      "e-NAM Auction System",
      "High-density Cotton Baling Press Nearby",
      "Quality Assay Lab",
      "Digital Weighing Platforms",
    ],
    contactPhone: "+91-721-2574100",
    contactEmail: "apmc.amravati@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 680,
    isActive: true,
  },
  {
    name: "Chhatrapati Sambhajinagar APMC (Jadhavwadi)",
    code: "MH-CSN-01",
    marketType: "apmc_mandi" as MarketType,
    district: "Aurangabad",
    state: "Maharashtra",
    address: "Jadhavwadi, Jalna Road, Chhatrapati Sambhajinagar",
    pincode: "431003",
    location: {
      type: "Point" as const,
      coordinates: [75.3621, 19.8974],
    },
    operatingHours: "06:00 AM - 04:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    majorCommodities: ["Cotton", "Maize", "Sweet Orange (Mosambi)", "Ginger", "Soyabean"],
    facilities: [
      "e-NAM Trading",
      "Mosambi Grading & Waxing Line",
      "Cold Storage (300 MT)",
      "Digital Electronic Scales",
      "Kisan Information Kiosk",
    ],
    contactPhone: "+91-240-2485300",
    contactEmail: "apmc.csn@mahamarkets.in",
    enamEnabled: true,
    verifiedBuyersCount: 750,
    isActive: true,
  },
  {
    name: "Manchar Sub-Yard Vegetable Mandi",
    code: "MH-PUN-03",
    marketType: "sub_yard" as MarketType,
    district: "Pune",
    state: "Maharashtra",
    address: "Manchar, Taluka Ambegaon, Pune",
    pincode: "410503",
    location: {
      type: "Point" as const,
      coordinates: [73.9427, 19.0069],
    },
    operatingHours: "07:00 AM - 02:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    majorCommodities: ["Tomato", "Potato", "Cauliflower", "Green Peas", "Cabbage"],
    facilities: ["Electronic Scales", "Farmer Shaded Auction Area", "Drinking Water & Canteen"],
    contactPhone: "+91-2133-223400",
    enamEnabled: false,
    verifiedBuyersCount: 310,
    isActive: true,
  },
  {
    name: "Nashik Shetkari Athawadi Bajar (Farmers Weekly Market)",
    code: "MH-NSK-03",
    marketType: "weekly_haat" as MarketType,
    district: "Nashik",
    state: "Maharashtra",
    address: "Dongare Vasatigruh Ground, Gangapur Road, Nashik",
    pincode: "422002",
    location: {
      type: "Point" as const,
      coordinates: [73.7661, 20.0076],
    },
    operatingHours: "08:00 AM - 08:00 PM",
    operatingDays: ["Sunday", "Wednesday"],
    majorCommodities: ["Organic Leafy Vegetables", "Seasonal Fruits", "Honey", "Millets", "Dairy"],
    facilities: ["Direct Farmer-to-Consumer Stalls", "UPI Digital Payment Kiosks", "Eco-friendly Bags"],
    contactPhone: "+91-253-2348900",
    enamEnabled: false,
    verifiedBuyersCount: 450,
    isActive: true,
  },
  {
    name: "Sahyadri Farmers Producer Co. Collection Hub",
    code: "MH-NSK-04",
    marketType: "fpo_collection_center" as MarketType,
    district: "Nashik",
    state: "Maharashtra",
    address: "Mohadi, Dindori, Nashik",
    pincode: "422207",
    location: {
      type: "Point" as const,
      coordinates: [73.8415, 20.1782],
    },
    operatingHours: "07:00 AM - 06:00 PM",
    operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    majorCommodities: ["Grapes", "Tomato", "Banana", "Pomegranate", "Dairy"],
    facilities: [
      "Automated Sorting & Optical Grading",
      "Controlled Atmosphere Cold Storage",
      "Direct Export Clearance",
      "Pre-cooling Chambers",
      "Fair Farmer Price Settlement",
    ],
    contactPhone: "+91-2557-259000",
    contactEmail: "info@sahyadrifarms.com",
    enamEnabled: true,
    verifiedBuyersCount: 520,
    isActive: true,
  },
];

export class MarketService {
  /**
   * Seed authentic Maharashtra APMCs and hubs if collection is empty
   */
  async seedMarketsIfEmpty(): Promise<number> {
    const count = await Market.countDocuments();
    if (count > 0) {
      return count;
    }

    console.log("🌱 Seeding authentic Maharashtra APMC markets & yards...");
    const created = await Market.insertMany(SEED_MARKETS);
    console.log(`✅ Seeded ${created.length} agricultural markets successfully.`);
    return created.length;
  }

  /**
   * Find nearby markets using coordinates or fallback to district/keyword search
   */
  async findNearbyMarkets(query: NearbyMarketQuery): Promise<MarketWithDistance[]> {
    const { lat, lng, radiusKm = 50, marketType, commodity, district, search, enamOnly } = query;

    // 1. If coordinates are provided, perform $geoNear aggregation
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      const maxDistanceMeters = Math.min(radiusKm, 300) * 1000; // max 300km

      const matchStage: any = { isActive: true };
      if (marketType) matchStage.marketType = marketType;
      if (enamOnly) matchStage.enamEnabled = true;
      if (district) matchStage.district = { $regex: new RegExp(district.trim(), "i") };
      if (commodity) {
        matchStage.majorCommodities = { $regex: new RegExp(commodity.trim(), "i") };
      }
      if (search) {
        const searchRegex = { $regex: new RegExp(search.trim(), "i") };
        matchStage.$or = [
          { name: searchRegex },
          { address: searchRegex },
          { district: searchRegex },
          { majorCommodities: searchRegex },
        ];
      }

      const pipeline: any[] = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [Number(lng), Number(lat)],
            },
            distanceField: "distanceMeters",
            maxDistance: maxDistanceMeters,
            spherical: true,
            query: matchStage,
          },
        },
        {
          $addFields: {
            distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 1] },
            id: { $toString: "$_id" },
          },
        },
        {
          $project: {
            distanceMeters: 0,
            __v: 0,
          },
        },
        { $sort: { distanceKm: 1 } },
        { $limit: 50 },
      ];

      const results = await Market.aggregate(pipeline);
      return results;
    }

    // 2. Non-geospatial query fallback (by district, type, search)
    const filter: any = { isActive: true };
    if (marketType) filter.marketType = marketType;
    if (enamOnly) filter.enamEnabled = true;
    if (district) filter.district = { $regex: new RegExp(district.trim(), "i") };
    if (commodity) {
      filter.majorCommodities = { $regex: new RegExp(commodity.trim(), "i") };
    }
    if (search) {
      const searchRegex = { $regex: new RegExp(search.trim(), "i") };
      filter.$or = [
        { name: searchRegex },
        { address: searchRegex },
        { district: searchRegex },
        { majorCommodities: searchRegex },
      ];
    }

    const markets = await Market.find(filter).sort({ enamEnabled: -1, name: 1 }).limit(50);
    return markets.map((m) => m.toJSON() as unknown as MarketWithDistance);
  }

  /**
   * Get unique list of major commodities traded across all markets
   */
  async getTradedCommodities(): Promise<string[]> {
    const commodities = await Market.distinct("majorCommodities", { isActive: true });
    return commodities.sort();
  }

  /**
   * Get details of a specific market by ID
   */
  async getMarketById(id: string): Promise<IMarket | null> {
    return Market.findOne({ _id: id, isActive: true });
  }
}

export const marketService = new MarketService();
export default marketService;
