"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { getStateFromGst } from "@/lib/gst";

interface QuickSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (supplier: { id: string; shopName: string; ownerName: string }) => void;
}

export function QuickSupplierModal({ open, onOpenChange, onSuccess }: QuickSupplierModalProps) {
  const qc = useQueryClient();
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Tamil Nadu");

  const handleGstChange = (val: string) => {
    setGstNumber(val);
    if (val) {
      const derived = getStateFromGst(val);
      if (derived) setState(derived);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        shopName,
        ownerName,
        whatsapp,
        email: email ? email.trim() : undefined,
        gstNumber: gstNumber ? gstNumber.trim() : undefined,
        city: city ? city.trim() : undefined,
        state,
      };
      return (await api.post("/suppliers", payload)).data;
    },
    onSuccess: (newSupplier) => {
      toast.success("Supplier added successfully!");
      // Invalidate supplier queries so dropdowns refetch and include the new record
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      onSuccess(newSupplier);
      onOpenChange(false);
      // Reset form
      setShopName("");
      setOwnerName("");
      setWhatsapp("");
      setEmail("");
      setGstNumber("");
      setCity("");
      setState("Tamil Nadu");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to add supplier");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !ownerName || !whatsapp) {
      toast.error("Shop name, owner name, and WhatsApp number are required");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay">
          <Dialog.Content className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Quick Add Supplier</h2>
              <Dialog.Close asChild>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ borderRadius: "50%", padding: "0.25rem" }}>
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem 1.5rem" }}>
                
                {/* Shop Name */}
                <div className="form-group">
                  <label className="form-label">Shop / Firm Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Tiruppur Fashion Mills"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>

                {/* Owner Name */}
                <div className="form-group">
                  <label className="form-label">Owner / Contact Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />
                </div>

                {/* WhatsApp Number */}
                <div className="form-group">
                  <label className="form-label">WhatsApp Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                  />
                </div>

                {/* GST Number */}
                <div className="form-group">
                  <label className="form-label">GST Number (GSTIN)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    style={{ textTransform: "uppercase" }}
                    value={gstNumber}
                    onChange={(e) => handleGstChange(e.target.value)}
                  />
                </div>

                {/* City & State */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Tiruppur"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Tamil Nadu"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
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
                  disabled={mutation.isPending || !shopName || !ownerName || !whatsapp}
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
