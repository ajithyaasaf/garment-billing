"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Receipt, Download } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, getPaymentStatusBadge, debounce } from "@/lib/utils";
import Link from "next/link";

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  invoiceDate: string;
  customer: { shopName: string; whatsapp: string };
  _count: { items: number };
}

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

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
                data.data.map((inv: Invoice) => (
                  <tr key={inv.id}>
                    <td>
                      <Link href={`/invoices/${inv.id}`} style={{ color: "var(--brand-600)", textDecoration: "none", fontWeight: 600 }}>
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 500 }}>{inv.customer.shopName}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{formatDate(inv.invoiceDate)}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{inv._count.items} items</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(inv.totalAmount)}</td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(inv.paidAmount)}</td>
                    <td style={{ color: inv.dueAmount > 0 ? "var(--danger)" : "var(--text-tertiary)", fontWeight: 600 }}>
                      {formatCurrency(inv.dueAmount)}
                    </td>
                    <td><span className={`badge ${getPaymentStatusBadge(inv.paymentStatus)}`}>{inv.paymentStatus}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <Link href={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm btn-icon" title="View">
                          <Receipt size={14} />
                        </Link>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Download PDF">
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
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
    </div>
  );
}
