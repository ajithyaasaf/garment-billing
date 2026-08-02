export const GENDER_OPTIONS = [
  { value: "MENS", label: "Men's" },
  { value: "WOMENS", label: "Women's" },
  { value: "KIDS", label: "Kids" },
  { value: "BABY", label: "Baby" },
  { value: "UNISEX", label: "Unisex" },
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]["value"];

export const GENDER_LABEL_MAP: Record<string, string> = GENDER_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {}
);

export function formatGender(gender?: string | null): string {
  if (!gender) return "";
  return GENDER_LABEL_MAP[gender] || gender;
}

export const SLEEVE_TYPE_OPTIONS = [
  "Half Sleeve",
  "Full Sleeve",
  "Sleeveless",
  "3/4 Sleeve",
] as const;

export const GST_SLAB_OPTIONS = [
  { value: 0, label: "0% (Exempt)" },
  { value: 5, label: "5%" },
  { value: 12, label: "12%" },
  { value: 18, label: "18%" },
  { value: 28, label: "28%" },
] as const;

export const COMMON_COLORS = [
  "Red",
  "Blue",
  "Green",
  "White",
  "Black",
  "Yellow",
  "Pink",
  "Orange",
  "Purple",
  "Grey",
];

// Baby sizes (Months)
export const BABY_SIZES = [
  "0-3M",
  "3-6M",
  "6-12M",
  "12-18M",
  "18-24M",
] as const;

// Kids sizes (Years)
export const KIDS_SIZES = [
  "1-2Y",
  "2-3Y",
  "3-4Y",
  "4-5Y",
  "5-6Y",
  "6-7Y",
  "7-8Y",
  "8-9Y",
  "9-10Y",
  "11-12Y",
  "13-14Y",
] as const;

// Adult sizes
export const ADULT_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "3XL",
  "Free Size",
] as const;

export const SIZE_GROUPS = [
  { key: "BABY", label: "Baby (Months)", sizes: BABY_SIZES },
  { key: "KIDS", label: "Kids (Years)", sizes: KIDS_SIZES },
  { key: "ADULT", label: "Adult Sizes", sizes: ADULT_SIZES },
] as const;

export type SizeGroupKey = (typeof SIZE_GROUPS)[number]["key"];

// Standardized list of common sizes
export const ALL_COMMON_SIZES = [
  ...BABY_SIZES,
  ...KIDS_SIZES,
  ...ADULT_SIZES,
];

export const COMMON_SIZES = ALL_COMMON_SIZES;
