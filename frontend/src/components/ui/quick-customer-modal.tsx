"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface QuickCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (customer: { id: string; shopName?: string; ownerName: string; type: string }) => void;
}

export function QuickCustomerModal({ open, onOpenChange, onSuccess }: QuickCustomerModalProps) {
  const qc = useQueryClient();
  const [type, setType] = useState<"WHOLESALE" | "RETAIL">("WHOLESALE");
  const [ownerName, setOwnerName] = useState("");
  const [shopName, setShopName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Tamil Nadu");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type,
        ownerName,
        shopName: type === "WHOLESALE" ? shopName : undefined,
        whatsapp,
        city,
        state,
      };
      return (await api.post("/customers", payload)).data;
    },
    onSuccess: (newCustomer) => {
      toast.success("Customer added successfully!");
      // Invalidate customer queries so the select dropdown updates its options
      qc.invalidateQueries({ queryKey: ["customers"] });
      onSuccess(newCustomer);
      onOpenChange(false);
      // Reset form
      setOwnerName("");
      setShopName("");
      setWhatsapp("");
      setCity("");
      setType("WHOLESALE");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to add customer");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName || !whatsapp) {
      toast.error("Please fill in required fields");
      return;
    }
    if (type === "WHOLESALE" && !shopName) {
      toast.error("Shop Name is required for wholesale customers");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay">
          <Dialog.Content className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Quick Add Customer</h2>
              <Dialog.Close asChild>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ borderRadius: "50%", padding: "0.25rem" }}>
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem 1.5rem" }}>
                
                {/* Customer Type Toggle */}
                <div className="form-group">
                  <label className="form-label">Customer Type *</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 justify-center ${type === "WHOLESALE" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setType("WHOLESALE")}
                      style={{ fontSize: "0.8125rem", fontWeight: 600 }}
                    >
                      Wholesale (B2B)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 justify-center ${type === "RETAIL" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setType("RETAIL")}
                      style={{ fontSize: "0.8125rem", fontWeight: 600 }}
                    >
                      Retail Customer
                    </button>
                  </div>
                </div>

                {/* Owner / Customer Name */}
                <div className="form-group">
                  <label className="form-label">
                    {type === "WHOLESALE" ? "Proprietor / Owner Name *" : "Customer Name *"}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />
                </div>

                {/* Shop Name (only for wholesale) */}
                {type === "WHOLESALE" && (
                  <div className="form-group">
                    <label className="form-label">Shop Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sri Balaji Textiles"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* WhatsApp */}
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

                {/* Address Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Madurai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Tamil Nadu"
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
                  disabled={mutation.isPending || !ownerName || !whatsapp}
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
