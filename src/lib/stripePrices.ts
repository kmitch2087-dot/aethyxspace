// Stripe price IDs for all services

export const SERVICE_TIERS = {
  tier1: {
    priceId: "price_1SwpcpCEyzqaryb8mReM49oZ",
    name: "Online Presence Starter - Tier 1",
    price: "$750",
  },
  tier2: {
    priceId: "price_1SwpdDCEyzqaryb8rqSMuwob",
    name: "Professional Brand Website - Tier 2",
    price: "$1,500–$2,000",
  },
  tier3: {
    priceId: "price_1SwpdWCEyzqaryb8wafKCMRx",
    name: "Signature Brand Presence - Tier 3",
    price: "Starting at $2,500",
  },
};

export const QUICK_SERVICES = {
  logoCreation: {
    priceId: "price_1SwQOyCEyzqaryb8zKLQHt8r",
    name: "Logo Creation",
    price: "$100",
  },
  brandAssetsFromLogo: {
    priceId: "price_1SwQPkCEyzqaryb8SJkRanuX",
    name: "Brand Assets From Current Logo",
    price: "$150",
  },
  logoAndAssets: {
    priceId: "price_1SwQPxCEyzqaryb8ducbgf3I",
    name: "Logo & Brand Assets Package",
    price: "$200",
  },
  siteMaintenanceMembership: {
    priceId: "price_1SwQQECEyzqaryb8F6NdVpEd",
    name: "Site Maintenance Membership",
    price: "$100/mo",
    isSubscription: true,
  },
};

export const ADD_ONS = {
  emailCampaign: {
    addon: {
      priceId: "price_1SwpdfCEyzqaryb8aOLSLDHU",
      price: "$150",
    },
    standalone: {
      priceId: "price_1SwpdgCEyzqaryb8S6mTStEJ",
      price: "$250",
    },
    name: "Email Campaign Setup",
  },
  cloudStorage: {
    addon: {
      priceId: "price_1SwpdhCEyzqaryb8yqo6buXZ",
      price: "$100",
    },
    standalone: {
      priceId: "price_1SwpdiCEyzqaryb8no3iEqu0",
      price: "$175",
    },
    name: "Cloud Storage Integration",
  },
  clientDashboard: {
    addon: {
      priceId: "price_1SwpdjCEyzqaryb8gwnxARTu",
      price: "$250",
    },
    standalone: {
      priceId: "price_1SwpdkCEyzqaryb8Q3UDllDR",
      price: "$400",
    },
    name: "Client Dashboard with Login",
  },
  ecommerce: {
    addon: {
      priceId: "price_1SwpdlCEyzqaryb8ujQAeBB9",
      price: "$300",
    },
    standalone: {
      priceId: "price_1SwpdmCEyzqaryb856v55Tz1",
      price: "$500",
    },
    name: "E-commerce Add-on",
  },
  bookingScheduling: {
    addon: {
      priceId: "price_1SwpdoCEyzqaryb8dPlLGtlf",
      price: "$125",
    },
    standalone: {
      priceId: "price_1SwpdpCEyzqaryb889g2b8pq",
      price: "$200",
    },
    name: "Booking & Scheduling",
  },
  analytics: {
    addon: {
      priceId: "price_1SwpdqCEyzqaryb8MUI1razb",
      price: "$100",
    },
    standalone: {
      priceId: "price_1SwpdrCEyzqaryb8CxEu3L38",
      price: "$175",
    },
    name: "Analytics Dashboard",
  },
};

export const APP_DEVELOPMENT = {
  native: {
    addon: {
      priceId: "price_1SwpdxCEyzqaryb8Oi2d6PwR",
      price: "$1,500",
    },
    standalone: {
      priceId: "price_1SwpdxCEyzqaryb8oiaeHHXG",
      price: "$4,500",
    },
    name: "Native App (Apple & Google Play Store)",
  },
  pwa: {
    addon: {
      priceId: "price_1SwpdzCEyzqaryb8N4HRAuij",
      price: "$300",
    },
    standalone: {
      priceId: "price_1SwpdzCEyzqaryb8fBB1OGte",
      price: "$900",
    },
    name: "Progressive Web App",
  },
};

// Helper to get price ID by add-on key
export function getAddOnPriceId(addOnKey: string, type: "addon" | "standalone"): string | null {
  const addOn = ADD_ONS[addOnKey as keyof typeof ADD_ONS];
  if (!addOn) return null;
  return addOn[type].priceId;
}

// Helper to get tier price ID
export function getTierPriceId(tier: 1 | 2 | 3): string {
  const tierMap = {
    1: SERVICE_TIERS.tier1.priceId,
    2: SERVICE_TIERS.tier2.priceId,
    3: SERVICE_TIERS.tier3.priceId,
  };
  return tierMap[tier];
}
