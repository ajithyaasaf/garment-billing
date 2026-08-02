"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { getStateFromGst } from "@/lib/gst";
import { supplierSchema, SupplierFormData } from "@/lib/validations/supplier";
import { allowDigitsOnly, allowGstOnly } from "@/lib/formatters";
import { useEffect } from "react";

interface QuickSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (supplier: { id: string; shopName: string; ownerName: string }) => void;
}

export function QuickSupplierModal({ open, onOpenChange, onSuccess }: QuickSupplierModalProps) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
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
      const derived = getStateFromGst(gstNumber);
      if (derived) setValue("state", derived);
    }
  }, [gstNumber, setValue]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const payload = {
        ...data,
        email: data.email ? data.email.trim() : undefined,
        gstNumber: data.gstNumber ? data.gstNumber.trim().toUpperCase() : undefined,
        address: data.address ? data.address.trim() : undefined,
        city: data.city ? data.city.trim() : undefined,
        pincode: data.pincode ? data.pincode.trim() : undefined,
      };
      return (await api.post("/suppliers", payload)).data;
    },
    onSuccess: (newSupplier) => {
      toast.success("Supplier added successfully!");
      // Instantly inject new supplier into active React Query caches for instant dropdown update
      qc.setQueriesData({ queryKey: ["suppliers-list"] }, (oldData: any) => {
        if (!oldData) return { data: [newSupplier] };
        if (Array.isArray(oldData.data)) {
          const exists = oldData.data.some((s: any) => s.id === newSupplier.id);
          return exists ? oldData : { ...oldData, data: [newSupplier, ...oldData.data] };
        }
        if (Array.isArray(oldData)) {
          const exists = oldData.some((s: any) => s.id === newSupplier.id);
          return exists ? oldData : [newSupplier, ...oldData];
        }
        return oldData;
      });
      qc.setQueriesData({ queryKey: ["suppliers"] }, (oldData: any) => {
        if (!oldData) return { data: [newSupplier] };
        if (Array.isArray(oldData.data)) {
          const exists = oldData.data.some((s: any) => s.id === newSupplier.id);
          return exists ? oldData : { ...oldData, data: [newSupplier, ...oldData.data] };
        }
        if (Array.isArray(oldData)) {
          const exists = oldData.some((s: any) => s.id === newSupplier.id);
          return exists ? oldData : [newSupplier, ...oldData];
        }
        return oldData;
      });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      onSuccess(newSupplier);
      onOpenChange(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to add supplier");
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay">
          <Dialog.Content className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Quick Add Supplier</h2>
              <Dialog.Close asChild>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ borderRadius: "50%", padding: "0.25rem" }}>
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem 1.5rem" }}>
                
                {/* Shop Name */}
                <div className="form-group">
                  <label className="form-label">Shop / Firm Name *</label>
                  <input
                    type="text"
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
                    type="text"
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
                    {...register("whatsapp", { onChange: allowDigitsOnly })}
                  />
                  {errors.whatsapp && (
                    <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                      {errors.whatsapp.message}
                    </span>
                  )}
                </div>

                {/* GSTIN */}
                <div className="form-group">
                  <label className="form-label">GST Number (GSTIN)</label>
                  <input
                    className={`form-input ${errors.gstNumber ? "border-red-500" : ""}`}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    style={{ textTransform: "uppercase" }}
                    maxLength={15}
                    {...register("gstNumber", { onChange: allowGstOnly })}
                  />
                  {errors.gstNumber && (
                    <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                      {errors.gstNumber.message}
                    </span>
                  )}
                </div>

                {/* Street Address */}
                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Shop address, Street, Locality..."
                    {...register("address")}
                  />
                </div>

                {/* City, State & Pincode */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" placeholder="e.g. Tiruppur" {...register("city")} />
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
                      {...register("pincode", { onChange: allowDigitsOnly })}
                    />
                    {errors.pincode && (
                      <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                        {errors.pincode.message}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--border-color)",
                background: "var(--bg-tertiary)",
                borderBottomLeftRadius: "var(--radius-xl)",
                borderBottomRightRadius: "var(--radius-xl)"
              }}>
                <Dialog.Close asChild>
                  <button type="button" className="btn btn-secondary">Cancel</button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={mutation.isPending}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
                >
                  {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Save Supplier
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

