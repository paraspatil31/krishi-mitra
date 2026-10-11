export interface VoiceCommandDef {
  action: "navigate" | "language" | "help";
  path?: string;
  roleScopedPath?: Record<string, string>;
  roleScopedLabel?: Record<string, string>;
  targetLang?: "en" | "hi" | "mr";
  label: string;
  keywords: string[];
}

export interface LocaleVoiceConfig {
  locale: "en" | "hi" | "mr";
  name: string;
  enabled: boolean;
  commands: VoiceCommandDef[];
}

// English commands (Enabled by default)
const EN_COMMANDS: VoiceCommandDef[] = [
  // ── Universal Navigation ──
  {
    action: "navigate",
    path: "/",
    label: "Home Page",
    keywords: ["home", "homepage", "main page", "go home", "back to home"],
  },
  {
    action: "navigate",
    path: "/products",
    label: "Produce Marketplace",
    keywords: ["marketplace", "products", "browse produce", "buy crops", "vegetables", "fruits", "shop produce", "buy food"],
  },
  {
    action: "navigate",
    path: "/settings",
    label: "Settings & Profile",
    keywords: ["settings", "preferences", "my profile", "account settings", "profile settings", "edit profile"],
  },
  {
    action: "navigate",
    path: "/login",
    label: "Login Page",
    keywords: ["login", "log in", "sign in", "signin", "open login", "go to login"],
  },
  {
    action: "navigate",
    path: "/signup",
    label: "Sign Up Page",
    keywords: ["signup", "sign up", "register", "registration", "create account", "open signup", "go to signup"],
  },

  // ── Agricultural Intelligence & Logistics ──
  {
    action: "navigate",
    path: "/mandi-prices",
    label: "Mandi Live Prices",
    keywords: ["mandi", "mandi price", "mandi rates", "apmc", "market price", "wholesale price", "mandi bhav"],
  },
  {
    action: "navigate",
    path: "/farmer/weather",
    label: "Weather Advisory",
    keywords: ["weather", "rain", "forecast", "temperature", "climate", "monsoon", "weather advisory", "rainfall"],
  },
  {
    action: "navigate",
    path: "/crop-doctor",
    label: "AI Crop Doctor & Quality",
    keywords: [
      "crop doctor", "leaf disease", "plant health", "quality check",
      "disease detection", "diagnose crop", "scan leaf", "plant doctor", "crop health"
    ],
  },
  {
    action: "navigate",
    path: "/markets/nearby",
    label: "Nearby Markets & Mandis",
    keywords: ["nearby market", "find market", "apmc mandi near me", "market finder", "nearby mandis"],
  },
  {
    action: "navigate",
    path: "/storage-facilities",
    label: "Cold Storage & Warehouses",
    keywords: ["storage", "cold storage", "warehouse", "godown", "cold store", "storage facilities"],
  },

  // ── Role-Scoped Contextual Navigation ──
  {
    action: "navigate",
    path: "/farmer/dashboard",
    roleScopedPath: {
      farmer: "/farmer/dashboard",
      buyer: "/buyer/dashboard",
      fpo: "/fpo/dashboard",
      admin: "/admin/dashboard",
    },
    roleScopedLabel: {
      farmer: "Farmer Dashboard",
      buyer: "Buyer Dashboard",
      fpo: "FPO Command Center",
      admin: "Admin Dashboard",
    },
    label: "Dashboard",
    keywords: ["dashboard", "my dashboard", "open dashboard", "go to dashboard"],
  },
  {
    action: "navigate",
    path: "/farmer/orders",
    roleScopedPath: {
      farmer: "/farmer/orders",
      buyer: "/buyer/orders",
      fpo: "/fpo/orders",
      admin: "/admin/orders",
    },
    roleScopedLabel: {
      farmer: "Farmer Orders & Fulfillment",
      buyer: "My Orders & Tracking",
      fpo: "FPO Member Orders",
      admin: "All System Orders",
    },
    label: "Orders",
    keywords: ["my orders", "orders", "view orders", "order history", "track orders", "sales orders", "incoming orders", "orders list"],
  },
  {
    action: "navigate",
    path: "/farmer/offers",
    roleScopedPath: {
      farmer: "/farmer/offers",
      buyer: "/buyer/offers",
      fpo: "/fpo/offers",
    },
    roleScopedLabel: {
      farmer: "Farmer Offers & Negotiation Desk",
      buyer: "My Sent Price Proposals",
      fpo: "FPO Negotiation Desk",
    },
    label: "Negotiation Offers",
    keywords: ["my offers", "offers", "proposals", "price offers", "buyer proposals", "negotiation desk", "sent offers", "received offers"],
  },

  // ── Farmer Dedicated Actions ──
  {
    action: "navigate",
    path: "/farmer/listings/new",
    label: "Create New Produce Listing",
    keywords: [
      "sell crops", "sell my crops", "sell crop", "sell produce", "add listing", "new listing", "create listing",
      "list crop", "list produce", "sell harvest", "post produce", "post crop", "add crop"
    ],
  },
  {
    action: "navigate",
    path: "/farmer/listings",
    label: "My Produce Listings & Stock",
    keywords: ["my listings", "view listings", "my crops", "inventory", "stock list", "my produce", "farm inventory"],
  },
  {
    action: "navigate",
    path: "/farmer/bulk-demands",
    label: "Institutional Bulk Demands",
    keywords: ["bulk demands", "bulk demand", "institutional demand", "wholesale requirements", "b2b demand", "buyer demand"],
  },

  // ── Buyer Dedicated Actions ──
  {
    action: "navigate",
    path: "/cart",
    label: "Shopping Cart",
    keywords: ["cart", "shopping cart", "my basket", "checkout bag", "basket", "view cart"],
  },
  {
    action: "navigate",
    path: "/checkout",
    label: "Checkout & Payment",
    keywords: ["checkout", "proceed to checkout", "pay now", "proceed to pay", "make payment", "payment page", "place order"],
  },

  // ── B2B, FPO & Admin Dedicated Actions ──
  {
    action: "navigate",
    path: "/business/dashboard",
    label: "B2B Business Dashboard",
    keywords: ["business dashboard", "b2b dashboard", "wholesale dashboard"],
  },
  {
    action: "navigate",
    path: "/fpo/dashboard",
    label: "FPO Hub Dashboard",
    keywords: ["fpo dashboard", "fpo hub", "producer organization"],
  },
  {
    action: "navigate",
    path: "/fpo/members",
    label: "FPO Member Roster",
    keywords: ["fpo members", "member roster", "farmer members"],
  },
  {
    action: "navigate",
    path: "/fpo/lots",
    label: "FPO Aggregated Lots",
    keywords: ["fpo lots", "aggregated lots", "produce pool"],
  },
  {
    action: "navigate",
    path: "/admin/dashboard",
    label: "Admin Dashboard",
    keywords: ["admin dashboard", "platform admin"],
  },
  {
    action: "navigate",
    path: "/admin/users",
    label: "Admin User Management",
    keywords: ["admin users", "manage users", "user directory"],
  },
  {
    action: "navigate",
    path: "/admin/listings",
    label: "Admin Listing Moderation",
    keywords: ["admin listings", "moderate listings"],
  },

  // ── Language Switches ──
  {
    action: "language",
    targetLang: "hi",
    label: "Switch to Hindi",
    keywords: ["switch to hindi", "change to hindi", "hindi language"],
  },
  {
    action: "language",
    targetLang: "mr",
    label: "Switch to Marathi",
    keywords: ["switch to marathi", "change to marathi", "marathi language"],
  },
  {
    action: "language",
    targetLang: "en",
    label: "Switch to English",
    keywords: ["switch to english", "change to english", "english language"],
  },
];

// Hindi commands (Transliterated / Natural conversational terms)
const HI_COMMANDS: VoiceCommandDef[] = [
  {
    action: "navigate",
    path: "/",
    label: "मुख्य पृष्ठ",
    keywords: ["होम", "होमपेज", "मुख्य पृष्ठ", "घर", "home"],
  },
  {
    action: "navigate",
    path: "/products",
    label: "कृषि बाज़ार",
    keywords: ["बाज़ार", "फसलें", "सब्जियां", "फल", "उत्पाद", "मार्केट", "खरीदारी"],
  },
  {
    action: "navigate",
    path: "/mandi-prices",
    label: "मंडी भाव",
    keywords: ["मंडी भाव", "मंडी रेट", "बाजार भाव", "मंडी के भाव", "एपीएमसी दर", "mandi bhav"],
  },
  {
    action: "navigate",
    path: "/farmer/weather",
    label: "मौसम सलाह",
    keywords: ["मौसम", "मौसम का हाल", "बारिश", "तापमान", "हवामान", "मौसम पूर्वानुमान", "mausam"],
  },
  {
    action: "navigate",
    path: "/crop-doctor",
    label: "क्रॉप डॉक्टर व जांच",
    keywords: ["क्रॉप डॉक्टर", "बीमारी जांच", "पौधे की बीमारी", "पत्ता जांच", "क्वालिटी चेक", "रोग पहचान"],
  },
  {
    action: "navigate",
    path: "/farmer/dashboard",
    roleScopedPath: {
      farmer: "/farmer/dashboard",
      buyer: "/buyer/dashboard",
      fpo: "/fpo/dashboard",
      admin: "/admin/dashboard",
    },
    label: "डैशबोर्ड",
    keywords: ["डैशबोर्ड", "मेरा डैशबोर्ड", "dashboard"],
  },
  {
    action: "navigate",
    path: "/farmer/listings/new",
    label: "नई फसल लिस्टिंग",
    keywords: ["फसल बेचें", "नई लिस्टिंग", "फसल जोड़ें", "उत्पाद लिस्ट करें", "नया उत्पाद", "फसल बेचना"],
  },
  {
    action: "navigate",
    path: "/farmer/listings",
    label: "मेरी लिस्टिंग व स्टॉक",
    keywords: ["मेरी लिस्टिंग", "मेरा स्टॉक", "मेरी फसलें", "इन्वेंट्री", "स्टॉक देखें"],
  },
  {
    action: "navigate",
    path: "/farmer/orders",
    roleScopedPath: {
      farmer: "/farmer/orders",
      buyer: "/buyer/orders",
      fpo: "/fpo/orders",
      admin: "/admin/orders",
    },
    label: "ऑर्डर सूची",
    keywords: ["ऑर्डर", "मेरे ऑर्डर", "ऑर्डर सूची", "आने वाले ऑर्डर", "बिक्री ऑर्डर", "orders"],
  },
  {
    action: "navigate",
    path: "/farmer/offers",
    roleScopedPath: {
      farmer: "/farmer/offers",
      buyer: "/buyer/offers",
      fpo: "/fpo/offers",
    },
    label: "मोलभाव और ऑफर",
    keywords: ["ऑफर", "प्रस्ताव", "मोलभाव", "रेट प्रस्ताव", "offers"],
  },
  {
    action: "navigate",
    path: "/farmer/bulk-demands",
    label: "संस्थागत थोक मांग",
    keywords: ["बल्क डिमांड", "थोक मांग", "संस्थागत मांग", "बड़ी मांग"],
  },
  {
    action: "navigate",
    path: "/cart",
    label: "शॉपिंग कार्ट",
    keywords: ["कार्ट", "शॉपिंग कार्ट", "कार्ट खोलो", "मेरा कार्ट", "cart"],
  },
  {
    action: "navigate",
    path: "/checkout",
    label: "चेकआउट व भुगतान",
    keywords: ["चेकआउट", "भुगतान करें", "पेमेंट", "ऑर्डर पूरा करें", "checkout"],
  },
  {
    action: "navigate",
    path: "/markets/nearby",
    label: "नजदीकी मंडियां",
    keywords: ["नजदीकी मंडी", "पास की मंडी", "मंडी खोजें", "आसपास की मंडी"],
  },
  {
    action: "navigate",
    path: "/storage-facilities",
    label: "कोल्ड स्टोरेज व गोदाम",
    keywords: ["कोल्ड स्टोरेज", "गोदाम", "वेयरहाउस", "भंडारण"],
  },
  {
    action: "navigate",
    path: "/settings",
    label: "सेटिंग्स व प्रोफाइल",
    keywords: ["सेटिंग्स", "मेरी प्रोफाइल", "खाता सेटिंग्स"],
  },
  {
    action: "navigate",
    path: "/login",
    label: "लॉगिन पेज",
    keywords: ["लॉगिन", "लॉग इन", "साइन इन", "खाता खोलें", "लॉगिन पेज", "login"],
  },
  {
    action: "navigate",
    path: "/signup",
    label: "साइन अप पेज",
    keywords: ["साइन अप", "रजिस्ट्रेशन", "पंजीकरण", "नया खाता", "खाता बनाएं", "साइन अप पेज", "signup"],
  },
  {
    action: "language",
    targetLang: "en",
    label: "अंग्रेजी में बदलें",
    keywords: ["अंग्रेजी में बदलो", "अंग्रेजी", "english mein badlo"],
  },
  {
    action: "language",
    targetLang: "mr",
    label: "मराठी में बदलें",
    keywords: ["मराठी में बदलो", "मराठी करो", "marathi mein badlo"],
  },
];

// Marathi commands (Transliterated / Natural conversational terms)
const MR_COMMANDS: VoiceCommandDef[] = [
  {
    action: "navigate",
    path: "/",
    label: "मुख्य पृष्ठ",
    keywords: ["होम", "होमपेज", "मुख्य पान", "home"],
  },
  {
    action: "navigate",
    path: "/products",
    label: "बाजारपेठ",
    keywords: ["बाजारपेठ", "उत्पादने", "भाजीपाला", "धान्य", "खरेदी"],
  },
  {
    action: "navigate",
    path: "/mandi-prices",
    label: "बाजारभाव",
    keywords: ["बाजारभाव", "मंडी दर", "बाजार भाव", "एपीएमसी भाव", "शेतमालाचे भाव", "bajarbhav"],
  },
  {
    action: "navigate",
    path: "/farmer/weather",
    label: "हवामान अंदाज",
    keywords: ["हवामान", "पाऊस", "तापमान", "हवामानाचा अंदाज", "havaman"],
  },
  {
    action: "navigate",
    path: "/crop-doctor",
    label: "क्रॉप डॉक्टर व गुणवत्ता",
    keywords: ["क्रॉप डॉक्टर", "पिकावरील रोग", "रोग निदान", "गुणवत्ता तपासणी", "तपासा"],
  },
  {
    action: "navigate",
    path: "/farmer/dashboard",
    roleScopedPath: {
      farmer: "/farmer/dashboard",
      buyer: "/buyer/dashboard",
      fpo: "/fpo/dashboard",
      admin: "/admin/dashboard",
    },
    label: "डॅशबोर्ड",
    keywords: ["डॅशबोर्ड", "माझा डॅशबोर्ड", "dashboard"],
  },
  {
    action: "navigate",
    path: "/farmer/listings/new",
    label: "नवीन शेतमाल नोंदवा",
    keywords: ["शेतमाल विका", "नवीन लिस्टिंग", "माल नोंदवा", "पीक जोडा", "विक्रीसाठी ठेवा", "नवीन पीक"],
  },
  {
    action: "navigate",
    path: "/farmer/listings",
    label: "माझी लिस्टिंग व साठा",
    keywords: ["माझी लिस्टिंग", "माझा साठा", "माझी पिके", "इन्व्हेंटरी", "साठा पहा"],
  },
  {
    action: "navigate",
    path: "/farmer/orders",
    roleScopedPath: {
      farmer: "/farmer/orders",
      buyer: "/buyer/orders",
      fpo: "/fpo/orders",
      admin: "/admin/orders",
    },
    label: "ऑर्डर्स",
    keywords: ["ऑर्डर्स", "माझ्या ऑर्डर्स", "शेतकरी ऑर्डर्स", "आलेल्या ऑर्डर्स", "orders"],
  },
  {
    action: "navigate",
    path: "/farmer/offers",
    roleScopedPath: {
      farmer: "/farmer/offers",
      buyer: "/buyer/offers",
      fpo: "/fpo/offers",
    },
    label: "दर वाटाघाटी व ऑफर्स",
    keywords: ["ऑफर्स", "प्रस्ताव", "दर वाटाघाटी", "वाटाघाटी", "offers"],
  },
  {
    action: "navigate",
    path: "/farmer/bulk-demands",
    label: "संस्थागत मोठी मागणी",
    keywords: ["बल्क मागणी", "मोठी मागणी", "संस्थागत मागणी"],
  },
  {
    action: "navigate",
    path: "/cart",
    label: "कार्ट",
    keywords: ["कार्ट", "माझे कार्ट", "कार्ट उघडा", "cart"],
  },
  {
    action: "navigate",
    path: "/checkout",
    label: "चेकआउट व पेमेंट",
    keywords: ["चेकआउट", "पैसे भरा", "पेमेंट करा", "checkout"],
  },
  {
    action: "navigate",
    path: "/markets/nearby",
    label: "जवळचे बाजार",
    keywords: ["जवळची बाजार समिती", "जवळची मंडी", "बाजार शोधा"],
  },
  {
    action: "navigate",
    path: "/storage-facilities",
    label: "शीतगृह व गोदाम",
    keywords: ["शीतगृह", "गोदाम", "कोल्ड स्टोरेज", "वखार"],
  },
  {
    action: "navigate",
    path: "/settings",
    label: "सेटिंग्ज व प्रोफाईल",
    keywords: ["सेटिंग्ज", "माझी प्रोफाईल", "खाते सेटिंग्ज"],
  },
  {
    action: "navigate",
    path: "/login",
    label: "लॉगिन पृष्ठ",
    keywords: ["लॉगिन", "लॉग इन", "साइन इन", "खाते उघडा", "लॉगिन करा", "login"],
  },
  {
    action: "navigate",
    path: "/signup",
    label: "नोंदणी / साइन अप",
    keywords: ["नोंदणी", "साइन अप", "नवीन खाते", "खाते तयार करा", "signup"],
  },
  {
    action: "language",
    targetLang: "en",
    label: "इंग्रजी करा",
    keywords: ["इंग्रजी करा", "इंग्रजी भाषा"],
  },
  {
    action: "language",
    targetLang: "hi",
    label: "हिंदी करा",
    keywords: ["हिंदी करा", "हिंदी भाषा"],
  },
];

export function getVoiceLocaleConfig(): Record<string, LocaleVoiceConfig> {
  const isHiMrEnabled = process.env.VOICE_COMMANDS_HI_MR_ENABLED === "true";

  return {
    en: {
      locale: "en",
      name: "English",
      enabled: true,
      commands: EN_COMMANDS,
    },
    hi: {
      locale: "hi",
      name: "Hindi",
      enabled: isHiMrEnabled,
      commands: HI_COMMANDS,
    },
    mr: {
      locale: "mr",
      name: "Marathi",
      enabled: isHiMrEnabled,
      commands: MR_COMMANDS,
    },
  };
}

/**
 * Matches a user transcript against active voice commands and dynamically resolves role-scoped targets
 */
export function matchVoiceCommand(
  transcript: string,
  activeLocale: "en" | "hi" | "mr" = "en",
  userRole: string = "guest"
): VoiceCommandDef | null {
  const configs = getVoiceLocaleConfig();
  const normalized = transcript.toLowerCase().trim();

  function resolveCmd(cmd: VoiceCommandDef): VoiceCommandDef {
    let path = cmd.path;
    let label = cmd.label;

    if (cmd.roleScopedPath && cmd.roleScopedPath[userRole]) {
      path = cmd.roleScopedPath[userRole];
    }
    if (cmd.roleScopedLabel && cmd.roleScopedLabel[userRole]) {
      label = cmd.roleScopedLabel[userRole];
    }

    return {
      ...cmd,
      path,
      label,
    };
  }

  // Try active locale first if enabled
  const currentConfig = configs[activeLocale];
  if (currentConfig && currentConfig.enabled) {
    for (const cmd of currentConfig.commands) {
      if (cmd.keywords.some((kw) => normalized.includes(kw.toLowerCase()))) {
        return resolveCmd(cmd);
      }
    }
  }

  // Fall back to English commands (always active)
  if (activeLocale !== "en") {
    for (const cmd of configs.en.commands) {
      if (cmd.keywords.some((kw) => normalized.includes(kw.toLowerCase()))) {
        return resolveCmd(cmd);
      }
    }
  }

  return null;
}
