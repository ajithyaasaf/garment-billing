"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, FileText, Copy, ArrowRight, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, formatDate, getQuotationStatusBadge, debounce } from "@/lib/utils";
import Link from "next/link";

interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  convertedToInvoice: boolean;
  customer: { shopName: string; whatsapp: string };
  createdBy: { name: string };
  _count: { items: number };
}

export default function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const qc = useQueryClient();

  const debouncedSetSearch = useCallback(
    debounce((val: string) => { setDebouncedSearch(val as string); setPage(1); }, 300), []
  );

  const { data, isLoading } = useQuery({
    queryKey: ["quotations", debouncedSearch, page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: "20", search: debouncedSearch, ...(statusFilter && { status: statusFilter }) });
      return (await api.get(`/quotations?${params}`)).data;
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/quotations/${id}/convert`)).data,
    onSuccess: (invoice) => {
      toast.success("Converted to invoice!");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      window.location.href = `/invoices/${invoice.id}`;
    },
    onError: () => toast.error("Conversion failed"),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/quotations/${id}/duplicate`)).data,
    onSuccess: () => { toast.success("Quotation duplicated"); qc.invalidateQueries({ queryKey: ["quotations"] }); },
    onError: () => toast.error("Duplication failed"),
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>Quotations</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{data?.meta?.total || 0} quotations</p>
        </div>
        <Link href="/quotations/new" className="btn btn-primary btn-sm w-full sm:w-auto">
          <Plus size={15} />
          New Quotation
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search size={15} color="var(--text-tertiary)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
          <input className="form-input w-full" style={{ paddingLeft: "2.25rem" }} placeholder="Quotation #, customer..." value={search}
            onChange={(e) => { setSearch(e.target.value); debouncedSetSearch(e.target.value); }} />
        </div>
        <div className="grid grid-cols-3 sm:flex gap-2">
          {["DRAFT", "SENT", "ACCEPTED", "CONVERTED", "REJECTED"].map((s) => (
            <button key={s} className={`btn btn-sm justify-center ${statusFilter === s ? "btn-primary" : "btn-secondary"}`}
              onClick={() => { setStatusFilter(statusFilter === s ? "" : s); setPage(1); }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="table-container">
        {isLoading ? (
          <div style={{ padding: "2rem" }}>
            {Array(6).fill(null).map((_, i) => <div key={i} className="skeleton" style={{ height: "3rem", marginBottom: "0.5rem", borderRadius: "0.375rem" }} />)}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Quotation #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.length ? data.data.map((q: Quotation) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/quotations/${q.id}`} className="text-[var(--brand-600)] hover:text-blue-600 hover:underline transition-colors" style={{ fontWeight: 600 }}>
                      {q.quotationNumber}
                    </Link>
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    <Link href={`/customers/${q.customerId}`} className="text-[var(--text-primary)] hover:text-blue-600 hover:underline transition-colors">
                      {q.customer.shopName}
                    </Link>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{formatDate(q.createdAt)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{q._count.items} items</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(q.totalAmount)}</td>
                  <td><span className={`badge ${getQuotationStatusBadge(q.status)}`}>{q.status}</span></td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.375rem" }}>
                      {!q.convertedToInvoice && q.status !== "CANCELLED" && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => convertMutation.mutate(q.id)}
                          disabled={convertMutation.isPending}
                          title="Convert to Invoice"
                        >
                          <ArrowRight size={13} />
                          Invoice
                        </button>
                      )}
                      <Link href={`/quotations/${q.id}`} className="btn btn-ghost btn-sm btn-icon" title="View">
                        <Eye size={14} />
                      </Link>
                      <button 
                        className="btn btn-ghost btn-sm btn-icon" 
                        title="Download/Print PDF"
                        onClick={() => window.open(`/quotations/${q.id}?print=true`, "_blank")}
                      >
                        <Download size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => duplicateMutation.mutate(q.id)}
                        title="Duplicate"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: "2rem" }}>
                      <FileText size={40} />
                      <p style={{ fontWeight: 600 }}>No quotations found</p>
                      <Link href="/quotations/new" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }}>
                        <Plus size={14} /> Create Quotation
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
