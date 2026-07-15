"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";
import { getStateFromGst } from "@/lib/gst";

interface SupplierForm {
  shopName: string;
  ownerName: string;
  whatsapp: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state: string;
  pincode?: string;
}

export default function EditSupplierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => (await api.get(`/suppliers/${id}`)).data,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SupplierForm>();

  useEffect(() => {
    if (supplier) {
      reset({
        shopName: supplier.shopName,
        ownerName: supplier.ownerName,
        whatsapp: supplier.whatsapp,
        email: supplier.email || "",
        gstNumber: supplier.gstNumber || "",
        address: supplier.address || "",
        city: supplier.city || "",
        state: supplier.state,
        pincode: supplier.pincode || "",
      });
    }
  }, [supplier, reset]);

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
    mutationFn: async (data: SupplierForm) => (await api.put(`/suppliers/${id}`, data)).data,
    onSuccess: () => {
      toast.success("Supplier updated successfully!");
      router.push(`/suppliers/${id}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || "Failed to update supplier"),
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <Loader2 className="animate-spin" size={24} color="var(--brand-600)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href={`/suppliers/${id}`} className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Edit Supplier</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Update supplier profile details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="card-header"><span style={{ fontWeight: 600 }}>Supplier Information</span></div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Shop Name */}
            <div className="form-group">
              <label className="form-label">Shop Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Tiruppur Fashion Mills"
                {...register("shopName", { required: "Shop name is required" })}
              />
              {errors.shopName && <span className="form-error">{errors.shopName.message}</span>}
            </div>

            {/* Owner Name */}
            <div className="form-group">
              <label className="form-label">Owner/Contact Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Ramesh Kumar"
                {...register("ownerName", { required: "Owner name is required" })}
              />
              {errors.ownerName && <span className="form-error">{errors.ownerName.message}</span>}
            </div>

            {/* WhatsApp */}
            <div className="form-group">
              <label className="form-label">WhatsApp Number *</label>
              <input
                className="form-input"
                placeholder="e.g. 9876543210"
                {...register("whatsapp", {
                  required: "WhatsApp number is required",
                  pattern: { value: /^[0-9]{10}$/, message: "Must be a 10 digit number" },
                })}
              />
              {errors.whatsapp && <span className="form-error">{errors.whatsapp.message}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. contact@supplier.com"
                {...register("email")}
              />
            </div>

            {/* GSTIN */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">GST Number (GSTIN)</label>
              <input
                className="form-input"
                placeholder="33AAAAA0000A1Z5"
                style={{ textTransform: "uppercase" }}
                {...register("gstNumber", {
                  pattern: { value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, message: "Invalid GSTIN format" }
                })}
              />
              {errors.gstNumber && <span className="form-error">{errors.gstNumber.message}</span>}
            </div>

            {/* Address */}
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
                className="form-input"
                placeholder="e.g. 641601"
                {...register("pincode")}
              />
            </div>

            {/* State */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">State</label>
              <input
                className="form-input"
                placeholder="Tamil Nadu"
                {...register("state")}
              />
            </div>

          </div>
        </motion.div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
          <Link href={`/suppliers/${id}`} className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: "0.5rem" }} />}
            Save Changes
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
