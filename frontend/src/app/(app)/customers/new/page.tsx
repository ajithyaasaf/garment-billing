"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";
import { getStateFromGst } from "@/lib/gst";

interface CustomerForm {
  type: "WHOLESALE" | "RETAIL";
  shopName?: string;
  ownerName: string;
  whatsapp: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state: string;
  pincode?: string;
  creditLimit: number;
  paymentTerms?: string;
}

export default function NewCustomerPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerForm>({
    defaultValues: { type: "WHOLESALE", state: "Tamil Nadu", creditLimit: 0, paymentTerms: "30 days" },
  });

  const gstNumber = watch("gstNumber");
  const customerType = watch("type");

  useEffect(() => {
    if (gstNumber) {
      const derivedState = getStateFromGst(gstNumber);
      if (derivedState) {
        setValue("state", derivedState);
      }
    }
  }, [gstNumber, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: CustomerForm) => (await api.post("/customers", { ...data, creditLimit: Number(data.creditLimit) })).data,
    onSuccess: (customer) => {
      toast.success("Customer added successfully!");
      router.push(`/customers/${customer.id}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || "Failed to add customer"),
  });

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/customers" className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Add Customer</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Add a new wholesale or retail customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="card-header"><span style={{ fontWeight: 600 }}>Customer Information</span></div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Customer Type Toggle */}
            <div className="form-group" style={{ gridColumn: "1 / -1", marginBottom: "0.25rem" }}>
              <label className="form-label">Customer Type *</label>
              <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-tertiary)", padding: "4px", borderRadius: "0.5rem", border: "1px solid var(--border-color)", maxWidth: "320px" }}>
                <button
                  type="button"
                  onClick={() => setValue("type", "WHOLESALE")}
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    borderRadius: "0.375rem",
                    border: "none",
                    background: customerType === "WHOLESALE" ? "var(--brand-600)" : "transparent",
                    color: customerType === "WHOLESALE" ? "white" : "var(--text-secondary)",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  Wholesale
                </button>
                <button
                  type="button"
                  onClick={() => setValue("type", "RETAIL")}
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    borderRadius: "0.375rem",
                    border: "none",
                    background: customerType === "RETAIL" ? "var(--brand-600)" : "transparent",
                    color: customerType === "RETAIL" ? "white" : "var(--text-secondary)",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  Retail
                </button>
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Shop Name {customerType === "WHOLESALE" ? "*" : "(optional)"}</label>
              <input className={`form-input ${errors.shopName ? "error" : ""}`} placeholder={customerType === "WHOLESALE" ? "e.g. Murugan Dress House" : "Shop / Company Name (Optional)"}
                {...register("shopName", { required: customerType === "WHOLESALE" ? "Shop name is required for wholesale customers" : false })} />
              {errors.shopName && <span className="form-error">{errors.shopName.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">{customerType === "WHOLESALE" ? "Owner Name *" : "Customer Name *"}</label>
              <input className={`form-input ${errors.ownerName ? "error" : ""}`} placeholder={customerType === "WHOLESALE" ? "Owner full name" : "Customer full name"}
                {...register("ownerName", { required: "Customer name is required" })} />
              {errors.ownerName && <span className="form-error">{errors.ownerName.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Number *</label>
              <input className={`form-input ${errors.whatsapp ? "error" : ""}`} placeholder="9876543210"
                {...register("whatsapp", { required: "WhatsApp number is required" })} />
              {errors.whatsapp && <span className="form-error">{errors.whatsapp.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="shop@example.com" {...register("email")} />
            </div>
            <div className="form-group">
              <label className="form-label">GST Number</label>
              <input className="form-input" placeholder="33ABCDE1234F1Z5" {...register("gstNumber")} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card" style={{ marginTop: "1rem" }}>
          <div className="card-header"><span style={{ fontWeight: 600 }}>Address</span></div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Address</label>
              <textarea className="form-input" rows={2} placeholder="Street address" {...register("address")} style={{ resize: "vertical" }} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" placeholder="e.g. Erode" {...register("city")} />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="form-input" {...register("state")} />
            </div>
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input className="form-input" placeholder="641601" {...register("pincode")} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card" style={{ marginTop: "1rem" }}>
          <div className="card-header"><span style={{ fontWeight: 600 }}>Credit & Payment</span></div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Credit Limit (₹)</label>
              <input type="number" min="0" className="form-input" placeholder="0" {...register("creditLimit")} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Terms</label>
              <select className="form-input form-select" {...register("paymentTerms")}>
                <option value="Cash on delivery">Cash on delivery</option>
                <option value="7 days">7 days</option>
                <option value="15 days">15 days</option>
                <option value="30 days">30 days</option>
                <option value="45 days">45 days</option>
                <option value="60 days">60 days</option>
              </select>
            </div>
          </div>
        </motion.div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
          <Link href="/customers" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
            {mutation.isPending ? "Adding..." : "Add Customer"}
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
