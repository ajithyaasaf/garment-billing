"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";
import { getStateFromGst } from "@/lib/gst";
import { supplierSchema, SupplierFormData } from "@/lib/validations/supplier";

export default function NewSupplierPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      shopName: "",
      ownerName: "",
      whatsapp: "",
      email: "",
      gstNumber: "",
      address: "",
      city: "",
      state: "Tamil Nadu",
      pincode: "",
    },
    mode: "onTouched",
  });

  const gstNumber = watch("gstNumber");

  useEffect(() => {
    if (gstNumber) {
      const derivedState = getStateFromGst(gstNumber);
      if (derivedState) {
        setValue("state", derivedState);
      }
    }
  }, [gstNumber, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: SupplierFormData) => (await api.post("/suppliers", data)).data,
    onSuccess: (supplier) => {
      toast.success("Supplier added successfully!");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
      router.push(`/suppliers/${supplier.id}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error || "Failed to add supplier"),
  });

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/suppliers" className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Add Supplier</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Add a new clothes vendor or sourcing partner
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Supplier Information</span>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Shop Name */}
            <div className="form-group">
              <label className="form-label">Shop Name *</label>
              <input
                className={`form-input ${errors.shopName ? "border-red-500" : ""}`}
                placeholder="e.g. Tiruppur Fashion Mills"
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
              <label className="form-label">Owner / Contact Name *</label>
              <input
                className={`form-input ${errors.ownerName ? "border-red-500" : ""}`}
                placeholder="e.g. Ramesh Kumar"
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
                placeholder="e.g. 9876543210"
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
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className={`form-input ${errors.email ? "border-red-500" : ""}`}
                placeholder="e.g. contact@supplier.com"
                {...register("email")}
              />
              {errors.email && (
                <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* GSTIN */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">GST Number (GSTIN)</label>
              <input
                className={`form-input ${errors.gstNumber ? "border-red-500" : ""}`}
                placeholder="e.g. 33AAAAA0000A1Z5"
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

            {/* Street Address */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Street Address</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Shop address, Street, Locality..."
                {...register("address")}
              />
            </div>

            {/* City */}
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                className="form-input"
                placeholder="e.g. Tiruppur"
                {...register("city")}
              />
            </div>

            {/* Pincode */}
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input
                type="text"
                inputMode="numeric"
                className={`form-input ${errors.pincode ? "border-red-500" : ""}`}
                placeholder="e.g. 641601"
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

            {/* State */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">State *</label>
              <input
                className={`form-input ${errors.state ? "border-red-500" : ""}`}
                placeholder="Tamil Nadu"
                {...register("state")}
              />
              {errors.state && (
                <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  {errors.state.message}
                </span>
              )}
            </div>

          </div>
        </motion.div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
          <Link href="/suppliers" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: "0.5rem" }} />
            )}
            Add Supplier
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
