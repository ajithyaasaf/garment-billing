import { z } from "zod";
import { phoneSchema, emailSchema, gstinSchema, pincodeSchema, requiredString } from "./common";

/**
 * Centralized Supplier Validation Schema
 * Reused in:
 * - Add Supplier Page (/suppliers/new)
 * - Edit Supplier Page (/suppliers/[id]/edit)
 * - Quick Add Supplier Modal (QuickSupplierModal)
 */
export const supplierSchema = z.object({
  shopName: requiredString("Shop name", 2),
  ownerName: requiredString("Owner / Contact name", 2),
  whatsapp: phoneSchema,
  email: emailSchema,
  gstNumber: gstinSchema,
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().min(1, "State is required"),
  pincode: pincodeSchema,
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
