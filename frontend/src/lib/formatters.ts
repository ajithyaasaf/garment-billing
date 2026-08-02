import React from "react";

/**
 * Strips non-digit characters in real-time for phone numbers and pincodes.
 */
export const allowDigitsOnly = (e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = e.target.value.replace(/\D/g, "");
};

/**
 * Converts text to uppercase and strips invalid characters for GSTIN fields.
 */
export const allowGstOnly = (e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
};
