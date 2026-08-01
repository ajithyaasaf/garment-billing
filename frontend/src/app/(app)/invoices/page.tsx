"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Receipt, Download, Eye, Pencil, CreditCard, Check, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, formatDate, getPaymentStatusBadge, debounce, openWhatsAppShare } from "@/lib/utils";
import Link from "next/link";
import { QuickPaymentModal } from "@/components/ui/quick-payment-modal";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  invoiceDate: string;
  customer: { shopName?: string; ownerName?: string; whatsapp: string; type?: string };
  _count: { items: number };
}

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentTarget, setPaymentTarget] = useState<{
    id: string;
    invoiceNumber: string;
    dueAmount: number;
    customerName: string;
  } | null>(null);

  const markFullPaid = useMutation({
    mutationFn: async (inv: Invoice) => {
      return (
        await api.post(`/invoices/${inv.id}/payment`, {
          amount: inv.dueAmount,
          method: "UPI",
          notes: "Marked as Paid in full",
        })
      ).data;
    },
    onSuccess: (_, inv) => {
      toast.success(`Invoice ${inv.invoiceNumber} marked as Fully Paid!`);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to mark invoice as paid");
    },
  });

  const debouncedSetSearch = useCallback(
    debounce((val: string) => { setDebouncedSearch(val as string); setPage(1); }, 300), []
  );

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", debouncedSearch, page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: debouncedSearch,
        ...(statusFilter && { paymentStatus: statusFilter }),
      });
      return (await api.get(`/invoices?${params}`)).data;
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>Invoices</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{data?.meta?.total || 0} invoices</p>
        </div>
        <Link href="/invoices/new" className="btn btn-primary btn-sm w-full sm:w-auto">
          <Plus size={15} />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search size={15} color="var(--text-tertiary)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
          <input
            className="form-input w-full"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="Invoice number, customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); debouncedSetSearch(e.target.value); }}
          />
        </div>
        <div className="grid grid-cols-3 sm:flex gap-2">
          {["PAID", "PARTIAL", "UNPAID"].map((status) => (
            <button
              key={status}
              className={`btn btn-sm justify-center ${statusFilter === status ? "btn-primary" : "btn-secondary"}`}
              onClick={() => { setStatusFilter(statusFilter === status ? "" : status); setPage(1); }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="table-container">
        {isLoading ? (
          <div style={{ padding: "2rem" }}>
            {Array(8).fill(null).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "3rem", marginBottom: "0.5rem", borderRadius: "0.375rem" }} />
            ))}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.length ? (
                data.data.map((inv: Invoice) => {
                  const isWholesale = inv.customer?.type === "WHOLESALE" || (Boolean(inv.customer?.shopName) && inv.customer?.type !== "RETAIL");
                  return (
                    <tr key={inv.id}>
                      <td>
                        <Link href={`/invoices/${inv.id}`} className="text-[var(--brand-600)] hover:text-blue-600 hover:underline transition-colors" style={{ fontWeight: 600 }}>
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${isWholesale ? "badge-purple" : "badge-info"}`}>
                          {isWholesale ? "Wholesale" : "Retail"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <Link href={`/customers/${inv.customerId}`} className="text-[var(--text-primary)] hover:text-blue-600 hover:underline transition-colors">
                          {inv.customer.shopName || inv.customer.ownerName}
                        </Link>
                      </td>
                    <td style={{ color: "var(--text-secondary)" }}>{formatDate(inv.invoiceDate)}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{inv._count.items} items</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(inv.totalAmount)}</td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(inv.paidAmount)}</td>
                    <td style={{ color: inv.dueAmount > 0 ? "var(--danger)" : "var(--text-tertiary)", fontWeight: 600 }}>
                      {formatCurrency(inv.dueAmount)}
                    </td>
                    <td><span className={`badge ${getPaymentStatusBadge(inv.paymentStatus)}`}>{inv.paymentStatus}</span></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        {inv.dueAmount > 0 && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", height: "auto" }}
                            title="Record Payment"
                            onClick={() =>
                              setPaymentTarget({
                                id: inv.id,
                                invoiceNumber: inv.invoiceNumber,
                                dueAmount: inv.dueAmount,
                                customerName: inv.customer.shopName || inv.customer.ownerName || "Customer",
                              })
                            }
                          >
                            <CreditCard size={12} />
                            <span>+ Pay</span>
                          </button>
                        )}
                        <Link href={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm btn-icon" title="View Invoice">
                          <Eye size={14} />
                        </Link>
                        <Link href={`/invoices/${inv.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit Invoice">
                          <Pencil size={14} />
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Share via WhatsApp"
                          style={{ color: "#10b981" }}
                          onClick={() =>
                            openWhatsAppShare({
                              phone: inv.customer.whatsapp,
                              customerName: inv.customer.shopName || inv.customer.ownerName,
                              documentType: "Tax Invoice",
                              documentNumber: inv.invoiceNumber,
                              totalAmount: inv.totalAmount,
                              date: inv.invoiceDate,
                              paymentStatus: inv.paymentStatus,
                            })
                          }
                        >
                          <MessageCircle size={14} />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm btn-icon" 
                          title="Download/Print PDF"
                          onClick={() => window.open(`/invoices/${inv.id}?print=true`, "_blank")}
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              ) : (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state" style={{ padding: "2rem" }}>
                      <Receipt size={40} />
                      <p style={{ fontWeight: 600 }}>No invoices found</p>
                      <Link href="/invoices/new" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }}>
                        <Plus size={14} /> Create Invoice
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </motion.div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>{page} / {data.meta.totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {/* 1-Click Quick Payment Modal */}
      <QuickPaymentModal
        open={Boolean(paymentTarget)}
        onOpenChange={(open) => {
          if (!open) setPaymentTarget(null);
        }}
        invoice={paymentTarget}
      />
    </div>
  );
}
