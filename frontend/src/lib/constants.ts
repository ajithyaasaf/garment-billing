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

export const COMMON_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "3XL",
  "Free Size",
];
