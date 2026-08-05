"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { X, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface QuickPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: {
    id: string;
    invoiceNumber: string;
    dueAmount: number;
    customerName: string;
  } | null;
}

export function QuickPaymentModal({ open, onOpenChange, invoice }: QuickPaymentModalProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>("UPI");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.dueAmount || 0);
      setMethod("UPI");
      setReference("");
      setNotes("");
    }
  }, [invoice]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!invoice) return;
      return (
        await api.post(`/invoices/${invoice.id}/payment`, {
          amount: Number(amount),
          method,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        })
      ).data;
    },
    onSuccess: () => {
      toast.success(`Payment of ${formatCurrency(amount)} recorded for ${invoice?.invoiceNumber}!`);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to record payment");
    },
  });

  if (!invoice) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay">
          <Dialog.Content className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px", padding: 0 }}>
          <div className="modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CreditCard size={18} className="text-[var(--brand-600)]" />
              <Dialog.Title style={{ fontWeight: 700, fontSize: "1rem" }}>
                Record Payment ({invoice.invoiceNumber})
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="btn btn-ghost btn-sm btn-icon">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="modal-body flex flex-col gap-4" style={{ padding: "1.25rem" }}>
              <div style={{ background: "var(--bg-tertiary)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Customer</div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{invoice.customerName}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Outstanding Due</div>
                  <div style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.9375rem" }}>
                    {formatCurrency(invoice.dueAmount)}
                  </div>
                </div>
              </div>

              <div className="form-group mb-0">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Payment Amount (₹) *</label>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.125rem 0.5rem" }}
                      onClick={() => setAmount(invoice.dueAmount)}
                    >
                      ⚡ Full ({formatCurrency(invoice.dueAmount)})
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.125rem 0.5rem" }}
                      onClick={() => setAmount(Number((invoice.dueAmount / 2).toFixed(2)))}
                    >
                      50%
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  max={invoice.dueAmount}
                  required
                  className="form-input"
                  style={{ fontWeight: 700, fontSize: "1.125rem" }}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Payment Method *</label>
                <select
                  className="form-select"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Transaction Ref / UTR No. (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. UTR123456789"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Received partial advance"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                padding: "1rem 1.25rem",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                background: "var(--bg-tertiary)",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={mutation.isPending || amount <= 0}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Recording...
                  </>
                ) : (
                  `Record ${formatCurrency(amount)}`
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Portal>
  </Dialog.Root>
  );
}
