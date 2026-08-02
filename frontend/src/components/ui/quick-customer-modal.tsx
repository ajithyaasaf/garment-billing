"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { customerSchema, CustomerFormData } from "@/lib/validations/customer";
import { allowDigitsOnly, allowGstOnly } from "@/lib/formatters";
import { getStateFromGst } from "@/lib/gst";
import { useEffect } from "react";

interface QuickCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (customer: { id: string; shopName?: string; ownerName: string; type: string }) => void;
}

export function QuickCustomerModal({ open, onOpenChange, onSuccess }: QuickCustomerModalProps) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
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

  const customerType = watch("type");
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
    mutationFn: async (data: CustomerFormData) => {
      const payload = {
        ...data,
        shopName: data.type === "WHOLESALE" ? data.shopName : undefined,
        address: data.address ? data.address.trim() : undefined,
        city: data.city ? data.city.trim() : undefined,
        pincode: data.pincode ? data.pincode.trim() : undefined,
        gstNumber: data.gstNumber ? data.gstNumber.trim().toUpperCase() : undefined,
      };
      return (await api.post("/customers", payload)).data;
    },
    onSuccess: (newCustomer) => {
      toast.success("Customer added successfully!");
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-list"] });
      onSuccess(newCustomer);
      onOpenChange(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to add customer");
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay">
          <Dialog.Content className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Quick Add Customer</h2>
              <Dialog.Close asChild>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ borderRadius: "50%", padding: "0.25rem" }}>
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem 1.5rem" }}>
                
                {/* Customer Type Toggle */}
                <div className="form-group">
                  <label className="form-label">Customer Type *</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 justify-center ${customerType === "WHOLESALE" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setValue("type", "WHOLESALE")}
                      style={{ fontSize: "0.8125rem", fontWeight: 600 }}
                    >
                      Wholesale (B2B)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 justify-center ${customerType === "RETAIL" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setValue("type", "RETAIL")}
                      style={{ fontSize: "0.8125rem", fontWeight: 600 }}
                    >
                      Retail Customer
                    </button>
                  </div>
                </div>

                {/* Owner / Customer Name */}
                <div className="form-group">
                  <label className="form-label">
                    {customerType === "WHOLESALE" ? "Proprietor / Owner Name *" : "Customer Name *"}
                  </label>
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

                {/* Shop Name (only for wholesale) */}
                {customerType === "WHOLESALE" && (
                  <div className="form-group">
                    <label className="form-label">Shop Name *</label>
                    <input
                      type="text"
                      className={`form-input ${errors.shopName ? "border-red-500" : ""}`}
                      placeholder="e.g. Sri Balaji Textiles"
                      {...register("shopName")}
                    />
                    {errors.shopName && (
                      <span className="form-error" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                        {errors.shopName.message}
                      </span>
                    )}
                  </div>
                )}

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

                {/* GSTIN (Optional / Recommended for Wholesale) */}
                <div className="form-group">
                  <label className="form-label">GST Number (GSTIN)</label>
                  <input
                    type="text"
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
                    placeholder="Door No, Street name, Locality..."
                    {...register("address")}
                  />
                </div>

                {/* City, State & Pincode */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Madurai"
                      {...register("city")}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                      type="text"
                      className={`form-input ${errors.state ? "border-red-500" : ""}`}
                      placeholder="e.g. Tamil Nadu"
                      {...register("state")}
                    />
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
                      placeholder="e.g. 625001"
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
                  Save Customer
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

