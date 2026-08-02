"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";
import { getStateFromGst } from "@/lib/gst";
import { customerSchema, CustomerFormData } from "@/lib/validations/customer";

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["customer-edit", id],
    queryFn: async () => (await api.get(`/customers/${id}`)).data,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      type: "WHOLESALE",
      shopName: "",
      ownerName: "",
      whatsapp: "",
      email: "",
      gstNumber: "",
      address: "",
      city: "",
      state: "Tamil Nadu",
      pincode: "",
      creditLimit: 0,
      paymentTerms: "30 days",
    },
    mode: "onTouched",
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

  useEffect(() => {
    if (customer) {
      setValue("type", customer.type || "WHOLESALE");
      setValue("shopName", customer.shopName || "");
      setValue("ownerName", customer.ownerName);
      setValue("whatsapp", customer.whatsapp);
      setValue("email", customer.email || "");
      setValue("gstNumber", customer.gstNumber || "");
      setValue("address", customer.address || "");
      setValue("city", customer.city || "");
      setValue("state", customer.state || "Tamil Nadu");
      setValue("pincode", customer.pincode || "");
      setValue("creditLimit", customer.creditLimit);
      setValue("paymentTerms", customer.paymentTerms || "30 days");
    }
  }, [customer, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormData) =>
      (await api.put(`/customers/${id}`, { ...data, creditLimit: Number(data.creditLimit) })).data,
    onSuccess: () => {
      toast.success("Customer updated successfully!");
      router.push(`/customers/${id}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error || "Failed to update customer"),
  });

  if (isLoadingCustomer) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="skeleton" style={{ width: "200px", height: "1.5rem", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ width: "100%", height: "250px" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href={`/customers/${id}`} className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Edit Customer</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Modify customer profile and credit limit</p>
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

            {/* Shop Name */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Shop Name {customerType === "WHOLESALE" ? "*" : "(optional)"}</label>
              <input
                className={`form-input ${errors.shopName ? "border-red-500" : ""}`}
                placeholder={customerType === "WHOLESALE" ? "e.g. Murugan Dress House" : "Shop / Company Name (Optional)"}
                {...register("shopName")}
              />
              {errors.shopName && (
                <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  {errors.shopName.message}
                </span>
              )}
            </div>

            {/* Owner Name */}
            <div className="form-group">
              <label className="form-label">{customerType === "WHOLESALE" ? "Owner Name *" : "Customer Name *"}</label>
              <input
                className={`form-input ${errors.ownerName ? "border-red-500" : ""}`}
                placeholder={customerType === "WHOLESALE" ? "Owner full name" : "Customer full name"}
                {...register("ownerName")}
              />
              {errors.ownerName && (
                <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  {errors.ownerName.message}
                </span>
              )}
            </div>

            {/* WhatsApp */}
            <div className="form-group">
              <label className="form-label">WhatsApp Number *</label>
              <input
                type="tel"
                className={`form-input ${errors.whatsapp ? "border-red-500" : ""}`}
                placeholder="9876543210"
                maxLength={10}
                {...register("whatsapp", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/\D/g, "");
                  },
                })}
              />
              {errors.whatsapp && (
                <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  {errors.whatsapp.message}
                </span>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className={`form-input ${errors.email ? "border-red-500" : ""}`}
                type="email"
                placeholder="shop@example.com"
                {...register("email")}
              />
              {errors.email && (
                <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* GSTIN */}
            <div className="form-group">
              <label className="form-label">GST Number</label>
              <input
                className={`form-input ${errors.gstNumber ? "border-red-500" : ""}`}
                placeholder="33ABCDE1234F1Z5"
                style={{ textTransform: "uppercase" }}
                maxLength={15}
                {...register("gstNumber", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                  },
                })}
              />
              {errors.gstNumber && (
                <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  {errors.gstNumber.message}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Address Card */}
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
              <label className="form-label">State *</label>
              <input className={`form-input ${errors.state ? "border-red-500" : ""}`} {...register("state")} />
              {errors.state && (
                <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  {errors.state.message}
                </span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input
                type="text"
                inputMode="numeric"
                className={`form-input ${errors.pincode ? "border-red-500" : ""}`}
                placeholder="641601"
                maxLength={6}
                {...register("pincode", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/\D/g, "");
                  },
                })}
              />
              {errors.pincode && (
                <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  {errors.pincode.message}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {customerType !== "RETAIL" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card" style={{ marginTop: "1rem" }}>
            <div className="card-header"><span style={{ fontWeight: 600 }}>Credit & Payment</span></div>
            <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Credit Limit (₹)</label>
                <input type="number" min="0" className={`form-input ${errors.creditLimit ? "border-red-500" : ""}`} placeholder="0" {...register("creditLimit")} />
                {errors.creditLimit && (
                  <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                    {errors.creditLimit.message}
                  </span>
                )}
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
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
          <Link href={`/customers/${id}`} className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite", marginRight: "0.5rem" }} />}
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

