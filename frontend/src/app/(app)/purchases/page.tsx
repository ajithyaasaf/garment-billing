"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Eye, Printer } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, getPaymentStatusBadge, debounce } from "@/lib/utils";
import Link from "next/link";

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
  supplier: { shopName: string; ownerName: string; whatsapp: string };
  _count: { items: number };
}

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const debouncedSetSearch = useCallback(
    debounce((val: string) => { setDebouncedSearch(val as string); setPage(1); }, 300), []
  );

  const { data, isLoading } = useQuery({
    queryKey: ["purchases", debouncedSearch, page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: debouncedSearch,
        ...(statusFilter && { paymentStatus: statusFilter }),
      });
      return (await api.get(`/purchases?${params}`)).data;
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>Purchase Bills</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{data?.meta?.total || 0} purchase bills</p>
        </div>
        <Link href="/purchases/new" className="btn btn-primary btn-sm w-full sm:w-auto">
          <Plus size={15} />
          New Purchase Bill
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search size={15} color="var(--text-tertiary)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
          <input
            className="form-input w-full"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="Bill number, supplier..."
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
                <th>Bill #</th>
                <th>Supplier Shop</th>
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
                data.data.map((bill: PurchaseBill) => (
                  <tr key={bill.id}>
                    <td>
                      <Link href={`/purchases/${bill.id}`} className="text-[var(--brand-600)] hover:text-blue-600 hover:underline transition-colors" style={{ fontWeight: 600 }}>
                        {bill.billNumber}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <Link href={`/suppliers/${bill.supplierId}`} className="text-[var(--text-primary)] hover:text-blue-600 hover:underline transition-colors">
                        {bill.supplier?.shopName}
                      </Link>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{formatDate(bill.billDate)}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{bill._count?.items || 0} items</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(bill.totalAmount)}</td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(bill.paidAmount)}</td>
                    <td style={{ color: bill.dueAmount > 0 ? "var(--danger)" : "var(--text-tertiary)", fontWeight: 600 }}>
                      {formatCurrency(bill.dueAmount)}
                    </td>
                    <td><span className={`badge ${getPaymentStatusBadge(bill.paymentStatus)}`}>{bill.paymentStatus}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <Link href={`/purchases/${bill.id}`} className="btn btn-ghost btn-sm btn-icon" title="View Bill">
                          <Eye size={14} />
                        </Link>
                        <button 
                          className="btn btn-ghost btn-sm btn-icon" 
                          title="Print"
                          onClick={() => window.open(`/purchases/${bill.id}?print=true`, "_blank")}
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                    No purchase bills found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
