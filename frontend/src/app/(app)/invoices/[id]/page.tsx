"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Plus, Receipt, Loader2, Calendar, Phone, Landmark } from "lucide-react";
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

interface InvoiceItem {
  id: string;
  productName: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  gstPercent: number;
  discount: number;
  totalAmount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  invoiceDate: string;
  notes?: string;
  termsConditions?: string;
  customer: {
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
  items: InvoiceItem[];
  payments: Payment[];
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("UPI");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice", id],
    queryFn: async () => (await api.get(`/invoices/${id}`)).data,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      return (await api.post(`/invoices/${id}/payment`, {
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
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => {
      toast.error("Failed to record payment");
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="skeleton" style={{ height: "4rem", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ height: "20rem" }} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="empty-state" style={{ padding: "4rem 2rem" }}>
        <Receipt size={48} />
        <h2>Invoice Not Found</h2>
        <Link href="/invoices" className="btn btn-primary" style={{ marginTop: "1rem" }}>Back to Invoices</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/invoices" className="btn btn-ghost btn-sm btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>{invoice.invoiceNumber}</h1>
              <span className={`badge ${getPaymentStatusBadge(invoice.paymentStatus)}`}>
                {invoice.paymentStatus}
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Created by {invoice.createdBy.name}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Download size={14} /> Print / Save PDF
          </button>
          {invoice.dueAmount > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => {
              setPayAmount(invoice.dueAmount.toString());
              setShowPaymentModal(true);
            }}>
              <Plus size={14} /> Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="print-layout" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem", alignItems: "start" }}>
        {/* Main Details Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card print-full">
            <div className="card-body">
              {/* Billing Info Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>From</span>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.25rem" }}>GarmentOS Wholesale</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Tiruppur, Tamil Nadu<br />
                    GST: 33ABCDE1234F1Z5
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>Bill To</span>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem", marginTop: "0.25rem", color: "var(--brand-600)" }}>{invoice.customer.shopName}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Owner: {invoice.customer.ownerName}<br />
                    {invoice.customer.address && `${invoice.customer.address}, `}
                    {invoice.customer.city && `${invoice.customer.city}, `}
                    {invoice.customer.state || "Tamil Nadu"}
                  </div>
                  {invoice.customer.gstNumber && (
                    <div style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      <strong>GST:</strong> {invoice.customer.gstNumber}
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: "flex", gap: "2rem", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", padding: "0.75rem 0", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <Calendar size={14} color="var(--text-tertiary)" />
                  <span style={{ color: "var(--text-secondary)" }}>Invoice Date:</span>
                  <strong style={{ fontWeight: 600 }}>{formatDate(invoice.invoiceDate)}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <Phone size={14} color="var(--text-tertiary)" />
                  <span style={{ color: "var(--text-secondary)" }}>WhatsApp:</span>
                  <strong style={{ fontWeight: 600 }}>{invoice.customer.whatsapp}</strong>
                </div>
              </div>

              {/* Items Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Variant</th>
                      <th style={{ textAlign: "right" }}>Qty</th>
                      <th style={{ textAlign: "right" }}>Rate</th>
                      <th style={{ textAlign: "right" }}>GST%</th>
                      <th style={{ textAlign: "right" }}>Disc%</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.productName}</td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.825rem" }}>
                          {item.color || "-"} / {item.size || "-"}
                        </td>
                        <td style={{ textAlign: "right" }}>{item.quantity}</td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
                        <td style={{ textAlign: "right" }}>{item.gstPercent}%</td>
                        <td style={{ textAlign: "right" }}>{item.discount}%</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "0.5rem", borderLeft: "3px solid var(--brand-500)", fontSize: "0.875rem" }}>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Notes:</div>
                  <div style={{ color: "var(--text-secondary)" }}>{invoice.notes}</div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Payment History Ledger */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card no-print">
            <div className="card-header" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Landmark size={16} color="var(--brand-500)" />
              <span style={{ fontWeight: 600 }}>Payment History Ledger</span>
            </div>
            <div className="card-body">
              {invoice.payments.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "0.5rem", border: "1px solid var(--border-color)" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                          Received via <span style={{ color: "var(--brand-600)" }}>{payment.method}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.125rem" }}>
                          {formatDate(payment.paidAt)} {payment.reference && `· Ref: ${payment.reference}`}
                        </div>
                        {payment.notes && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", fontStyle: "italic" }}>
                            "{payment.notes}"
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, color: "var(--success)" }}>
                        +{formatCurrency(payment.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "1rem", fontSize: "0.875rem" }}>
                  No payments recorded for this invoice yet.
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Calculation Panel */}
        <div className="no-print" style={{ position: "sticky", top: "80px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="card">
            <div className="card-header"><span style={{ fontWeight: 600 }}>Billing Summary</span></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Total Amount</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Paid So Far</span>
                <span style={{ fontWeight: 600, color: "var(--success)" }}>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div style={{ height: "1px", background: "var(--border-color)" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>Due Balance</span>
                <span style={{ fontWeight: 800, color: invoice.dueAmount > 0 ? "var(--danger)" : "var(--success)", fontSize: "1.125rem" }}>
                  {formatCurrency(invoice.dueAmount)}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ maxWidth: "450px", width: "100%", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-xl)" }}>
              <div className="card-header"><span style={{ fontWeight: 700 }}>Record Payment</span></div>
              <form onSubmit={(e) => { e.preventDefault(); recordPaymentMutation.mutate(); }}>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Payment Amount (₹) *</label>
                    <input type="number" min="0.01" step="0.01" max={invoice.dueAmount} className="form-input" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem", display: "block" }}>
                      Max due: {formatCurrency(invoice.dueAmount)}
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Method *</label>
                    <select className="form-input form-select" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="BANK_TRANSFER">Bank NetBanking / NEFT</option>
                      <option value="CASH">Cash payment</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reference ID (optional)</label>
                    <input className="form-input" placeholder="e.g. UTR or Transaction number" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <textarea className="form-input" placeholder="Payment notes..." rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} style={{ resize: "none" }} />
                  </div>
                </div>
                <div className="card-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={recordPaymentMutation.isPending || !payAmount}>
                    {recordPaymentMutation.isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                    Record Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            background: white !important;
          }
          .print-layout {
            display: block !important;
          }
          aside.sidebar, header {
            display: none !important;
          }
          main {
            margin-left: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
