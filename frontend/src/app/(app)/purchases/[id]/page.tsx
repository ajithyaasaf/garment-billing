"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Plus, Receipt, Loader2, Calendar, Phone, Landmark, X, Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, formatDate, getPaymentStatusBadge } from "@/lib/utils";
import Link from "next/link";

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt: string;
  notes?: string;
}

interface PurchaseItem {
  id: string;
  productName: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  gstPercent: number;
  totalAmount: number;
}

interface PurchaseBill {
  id: string;
  billNumber: string;
  supplierId: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  billDate: string;
  dueDate?: string;
  notes?: string;
  supplier: {
    shopName: string;
    ownerName: string;
    whatsapp: string;
    email?: string;
    gstNumber?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  createdBy: { name: string };
  items: PurchaseItem[];
  payments: Payment[];
}

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("UPI");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const { data: purchase, isLoading } = useQuery<PurchaseBill>({
    queryKey: ["purchase", id],
    queryFn: async () => (await api.get(`/purchases/${id}`)).data,
  });

  const { data: business } = useQuery({
    queryKey: ["business-profile"],
    queryFn: async () => (await api.get("/settings/business")).data,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      return (await api.post(`/purchases/${id}/payments`, {
        amount: Number(payAmount),
        method: payMethod,
        reference: payRef,
        notes: payNotes,
      })).data;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully!");
      setShowPaymentModal(false);
      setPayAmount("");
      setPayRef("");
      setPayNotes("");
      qc.invalidateQueries({ queryKey: ["purchase", id] });
      qc.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: () => {
      toast.error("Failed to record payment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return (await api.delete(`/purchases/${id}`)).data;
    },
    onSuccess: () => {
      toast.success("Purchase bill deleted and variant stock levels reverted.");
      router.push("/purchases");
      qc.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to delete purchase bill");
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this purchase bill? This will reverse the stock increment for all items.")) {
      deleteMutation.mutate();
    }
  };

  useEffect(() => {
    if (!isLoading && purchase && typeof window !== "undefined" && window.location.search.includes("print=true")) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, purchase]);

  if (isLoading) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="skeleton" style={{ height: "4rem", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ height: "20rem" }} />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Purchase bill not found</p>
        <Link href="/purchases" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
          Back to Purchases
        </Link>
      </div>
    );
  }

  return (
    <div className="invoice-detail-page">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/purchases" className="btn btn-ghost btn-sm btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Bill {purchase.billNumber}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
              Supplier: {purchase.supplier.shopName}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Download size={14} />
            Print Bill
          </button>
          {purchase.dueAmount > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>
              <Plus size={14} />
              Record Payment
            </button>
          )}
          <button className="btn btn-secondary btn-sm" style={{ color: "var(--danger)" }} onClick={handleDelete} disabled={deleteMutation.isPending}>
            <Trash2 size={14} />
            Delete Bill
          </button>
        </div>
      </div>

      {/* Main Print Layout */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card invoice-card print-card" style={{ padding: "2.5rem" }}>
        {/* Header Block */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "2rem", borderBottom: "2px solid var(--border-color)", paddingBottom: "1.5rem", marginBottom: "2rem" }} className="print-header-layout">
          <div>
            {business?.name ? (
              <>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-600)" }}>{business.name}</h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem", whiteSpace: "pre-line", maxWidth: "300px" }}>
                  {business.address}
                  {business.gstNumber && `\nGSTIN: ${business.gstNumber}`}
                </p>
              </>
            ) : (
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-600)" }}>GarmentOS ERP</h2>
            )}
          </div>
          <div style={{ textAlign: "right" }} className="print-header-right">
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--brand-600)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              PURCHASE BILL
            </span>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0.25rem 0" }}>{purchase.billNumber}</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Date: {formatDate(purchase.billDate)}
            </p>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.5rem" }}>
              Sourced From
            </span>
            <h4 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{purchase.supplier.shopName}</h4>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Proprietor: {purchase.supplier.ownerName}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem", whiteSpace: "pre-line" }}>
              {purchase.supplier.address}
              {purchase.supplier.city && `, ${purchase.supplier.city}`}
              {purchase.supplier.state && `, ${purchase.supplier.state}`}
            </p>
            {purchase.supplier.gstNumber && (
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.5rem" }}>
                GSTIN: {purchase.supplier.gstNumber}
              </p>
            )}
          </div>

          <div style={{ textAlign: "right" }} className="print-details-right">
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.5rem" }}>
              Payment Details
            </span>
            <div style={{ display: "inline-flex", flexDirection: "column", gap: "0.375rem", fontSize: "0.8125rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "2rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Payment Status:</span>
                <span className={`badge ${getPaymentStatusBadge(purchase.paymentStatus)}`} style={{ alignSelf: "center" }}>
                  {purchase.paymentStatus}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "2rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Method:</span>
                <span style={{ fontWeight: 600 }}>{purchase.paymentMethod}</span>
              </div>
              {purchase.dueDate && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "2rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Due Date:</span>
                  <span style={{ fontWeight: 600, color: "var(--danger)" }}>{formatDate(purchase.dueDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sourced Items Table */}
        <div className="table-container mb-8">
          <table className="table">
            <thead>
              <tr style={{ background: "var(--bg-tertiary)" }}>
                <th>S.No</th>
                <th>Product Sourced</th>
                <th>Color / Size</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Cost Price</th>
                <th style={{ textAlign: "right" }}>GST %</th>
                <th style={{ textAlign: "right" }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{item.productName}</td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {item.color || "—"} / {item.size || "—"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 500 }}>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>{item.gstPercent}%</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{formatCurrency(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
          <div style={{ width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Sourced Total (Before GST)</span>
              <span style={{ fontWeight: 500 }}>
                {formatCurrency(purchase.totalAmount - (purchase.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.gstPercent / 100)), 0)))}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>GST Tax Amount</span>
              <span style={{ fontWeight: 500 }}>
                {formatCurrency(purchase.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.gstPercent / 100)), 0))}
              </span>
            </div>

            <div style={{ height: "1px", background: "var(--border-color)", margin: "0.25rem 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.0625rem" }}>
              <span style={{ fontWeight: 700 }}>Total Sourced Cost</span>
              <span style={{ fontWeight: 800, color: "var(--brand-600)" }}>{formatCurrency(purchase.totalAmount)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)" }}>
              <span style={{ fontWeight: 600 }}>Amount Paid to Vendor</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(purchase.paidAmount)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: purchase.dueAmount > 0 ? "var(--danger)" : "var(--text-tertiary)" }}>
              <span style={{ fontWeight: 600 }}>Outstanding Balance Due</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(purchase.dueAmount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {purchase.notes && (
          <div style={{ marginTop: "3rem", padding: "1rem", background: "var(--bg-tertiary)", borderRadius: "0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: "0.25rem", color: "var(--text-primary)" }}>Notes / Remarks:</span>
            {purchase.notes}
          </div>
        )}

        {/* Signature Block */}
        <div style={{ display: "none" }} className="print-signature-block">
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5rem" }}>
            <div>
              <div style={{ height: "1px", width: "180px", background: "var(--text-secondary)", marginBottom: "0.5rem" }} />
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Supplier Signature</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ height: "1px", width: "180px", background: "var(--text-secondary)", marginBottom: "0.5rem" }} />
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Authorized Signatory</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Ledger / History */}
      {purchase.payments && purchase.payments.length > 0 && (
        <div className="card no-print" style={{ marginTop: "1.5rem" }}>
          <div className="card-header"><span style={{ fontWeight: 600 }}>Payment Logs / History</span></div>
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payment Method</th>
                    <th>Reference ID</th>
                    <th>Notes</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.payments.map((pmt) => (
                    <tr key={pmt.id}>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{formatDate(pmt.paidAt)}</td>
                      <td style={{ fontWeight: 600 }}>{pmt.method}</td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{pmt.reference || "—"}</td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{pmt.notes || "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>{formatCurrency(pmt.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog.Root open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <Dialog.Portal>
          <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 50 }} />
          <Dialog.Content
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              width: "90%",
              maxWidth: "450px",
              boxShadow: "var(--shadow-xl)",
              zIndex: 51,
            }}
          >
            <Dialog.Title style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              Record Supplier Payment
            </Dialog.Title>
            <Dialog.Description style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Log payments made to the supplier. This updates the bill outstanding balance.
            </Dialog.Description>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                recordPaymentMutation.mutate();
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder={`Max: ${purchase.dueAmount}`}
                  max={purchase.dueAmount}
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-input form-select" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="UPI">UPI / Netbanking</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reference ID (optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g. TXN942058"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Additional payment details..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <Dialog.Close asChild>
                  <button type="button" className="btn btn-secondary btn-sm">Cancel</button>
                </Dialog.Close>
                <button type="submit" className="btn btn-primary btn-sm" disabled={recordPaymentMutation.isPending}>
                  {recordPaymentMutation.isPending && <Loader2 size={12} style={{ animation: "spin 1s linear infinite", marginRight: "0.25rem" }} />}
                  Record Payment
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          .no-print { display: none !important; }
          .app-shell { background: white !important; }
          body { background: white !important; }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
          }
          .print-signature-block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
