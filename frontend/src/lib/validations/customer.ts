import { z } from "zod";
import { phoneSchema, emailSchema, gstinSchema, pincodeSchema, requiredString } from "./common";

/**
 * Centralized Customer Validation Schema
 * Reused in:
 * - Add Customer Page (/customers/new)
 * - Edit Customer Page (/customers/[id]/edit)
 * - Quick Add Customer Modal (QuickCustomerModal)
 */
export const customerSchema = z
  .object({
    type: z.enum(["WHOLESALE", "RETAIL"]),
    shopName: z.string().trim().optional().or(z.literal("")),
    ownerName: requiredString("Customer name", 2),
    whatsapp: phoneSchema,
    email: emailSchema,
    gstNumber: gstinSchema,
    address: z.string().trim().optional().or(z.literal("")),
    city: z.string().trim().optional().or(z.literal("")),
    state: z.string().trim().min(1, "State is required"),
    pincode: pincodeSchema,
    creditLimit: z.number().min(0, "Credit limit cannot be negative"),
    paymentTerms: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "WHOLESALE") {
        return Boolean(data.shopName && data.shopName.trim().length >= 2);
      }
      return true;
    },
    {
      message: "Shop name is required for wholesale customers",
      path: ["shopName"],
    }
  );

export type CustomerFormData = z.infer<typeof customerSchema>;
