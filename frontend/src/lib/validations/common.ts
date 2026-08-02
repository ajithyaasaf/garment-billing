import { z } from "zod";

/**
 * Reusable field-level validation schemas for business domain models.
 * Centralized for consistency across all forms (Suppliers, Customers, Business Profile, etc.)
 */

// 10-digit Indian Mobile / WhatsApp number validator
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "WhatsApp number is required")
  .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit mobile number (e.g. 9876543210)");

// Optional Email Validator
export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address format (e.g. contact@supplier.com)")
  .optional()
  .or(z.literal(""));

// Indian GSTIN Validator (15 chars: State code + PAN + Entity # + Z + Checksum)
export const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((val) => val === "" || gstinRegex.test(val), {
    message: "Invalid GSTIN format (15 characters, e.g. 33AAAAA0000A1Z5)",
  })
  .optional()
  .or(z.literal(""));

// Indian 6-digit Pincode Validator
export const pincodeSchema = z
  .string()
  .trim()
  .refine((val) => val === "" || /^\d{6}$/.test(val), {
    message: "Pincode must be a 6-digit number (e.g. 641601)",
  })
  .optional()
  .or(z.literal(""));

// Helper for required string fields
export const requiredString = (fieldName: string, minLength = 2) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .min(minLength, `${fieldName} must be at least ${minLength} characters`);
