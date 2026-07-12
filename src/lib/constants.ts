// Central definitions for role/status vocabularies and listing option lists.

export const ROLES = [
  "BUYER",
  "SELLER",
  "DEALER",
  "INSPECTOR",
  "LOGISTICS",
  "FINANCE",
  "MODERATOR",
  "ADMIN",
] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: Role[] = ["MODERATOR", "ADMIN"];

export const ROLE_LABELS: Record<Role, string> = {
  BUYER: "Buyer",
  SELLER: "Private Seller",
  DEALER: "Dealership",
  INSPECTOR: "Inspector",
  LOGISTICS: "Logistics Partner",
  FINANCE: "Finance Partner",
  MODERATOR: "Moderator",
  ADMIN: "Administrator",
};

export const LISTING_STATUSES = ["DRAFT", "PENDING", "ACTIVE", "SOLD", "REJECTED", "ARCHIVED"] as const;
export const LISTING_TIERS = ["FREE", "PREMIUM", "ULTIMATE"] as const;

export const CONDITIONS = ["NEW", "LIKE_NEW", "EXCELLENT", "GOOD", "FAIR"] as const;
export const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
};

export const BODY_STYLES = [
  "Sedan",
  "SUV",
  "Truck",
  "Coupe",
  "Hatchback",
  "Convertible",
  "Van",
  "Wagon",
] as const;

export const FUEL_TYPES = ["Gasoline", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric", "LPG"] as const;
export const TRANSMISSIONS = ["Automatic", "Manual", "CVT", "Dual-clutch"] as const;
export const DRIVETRAINS = ["FWD", "RWD", "AWD", "4WD"] as const;

export const POPULAR_MAKES = [
  "Toyota",
  "Honda",
  "Ford",
  "Chevrolet",
  "Tesla",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Lexus",
  "Hyundai",
  "Kia",
  "Nissan",
  "Volkswagen",
  "Subaru",
  "Mazda",
  "Jeep",
  "GMC",
  "Porsche",
] as const;

export const FEATURE_OPTIONS = [
  "Sunroof / Moonroof",
  "Leather Seats",
  "Navigation System",
  "Backup Camera",
  "Blind Spot Monitor",
  "Adaptive Cruise Control",
  "Lane Keep Assist",
  "Apple CarPlay / Android Auto",
  "Heated Seats",
  "Ventilated Seats",
  "Third Row Seating",
  "Tow Package",
  "Premium Audio",
  "Remote Start",
  "Keyless Entry",
  "Parking Sensors",
  "360° Camera",
  "Head-Up Display",
  "Wireless Charging",
  "Panoramic Roof",
] as const;

export const OFFER_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "COUNTERED", "WITHDRAWN"] as const;
