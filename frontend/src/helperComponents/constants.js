export const SUPPLY_META = {
  A: { label: "Adequate", color: "text-green-700", bg: "bg-green-100", border: "border-green-300" },
  S: { label: "Surplus", color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-300" },
  D: { label: "Deficit", color: "text-red-700", bg: "bg-red-100", border: "border-red-300" },
  NONE: { label: "None", color: "text-gray-500", bg: "bg-gray-100", border: "border-gray-300" },
};

export const A1_HEADERS = [
  "Commodity", "Category", "Specification", "Unit",
  "R1", "R2", "R3", "R4", "R5",
  "High", "Low", "Mode#", "Prevailing", "Supply",
];

export const B1_HEADERS = [
  "Commodity", "Category", "Specification", "Unit",
  "High", "Low", "Prevailing (Today)", "Prevailing (Prev)", "% Change", "Supply",
];

export const A1_CATEGORY_ROWS = {
  8:  "IMPORTED COMMERCIAL RICE",
  13: "LOCAL COMMERCIAL RICE",
  18: "FISH",
  24: "LIVESTOCK & POULTRY PRODUCTS",
  31: "LOWLAND VEGETABLES",
  38: "HIGHLAND VEGETABLES",
  45: "SPICES",
  54: "FRUITS",
  60: "OTHER BASIC COMMODITIES",
  66: "CORN",
  69: "ROOTCROPS",
};

export const B1_CATEGORY_ROWS = {
  8:  "IMPORTED COMMERCIAL RICE",
  13: "LOCAL COMMERCIAL RICE",
  18: "FISH",
  24: "LIVESTOCK & POULTRY PRODUCTS",
  31: "LOWLAND VEGETABLES",
  38: "HIGHLAND VEGETABLES",
  45: "SPICES",
  54: "FRUITS",
  60: "OTHER BASIC COMMODITIES",
  66: "CORN",
  69: "ROOTCROPS",
};

// Row values in the footer/signature area that should be treated as titles/roles
// rather than names, and displayed separately under the signatory's name.
export const KNOWN_TITLES = [
  "Market Specialist I",
  "Market Specialist II",
  "Section Chief, AISS",
  "OIC- Chief, AMAD",
  "OIC-Chief, AMAD",
  "Chief, AMAD",
  "Regional Director",
  "Agricultural Technologist",
  "Agriculturist I",
  "Agriculturist II",
];