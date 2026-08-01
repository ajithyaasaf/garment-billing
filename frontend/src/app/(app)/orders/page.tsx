"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShoppingBag, Plus, Download, Eye, Search, ChevronLeft, ChevronRight, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, formatDate, openWhatsAppShare } from "@/lib/utils";
import Link from "next/link";
import { StatusBadgeSelect } from "@/components/ui/status-badge-select";

interface OrderItem {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer: { shopName?: string; ownerName?: string; type?: string };
  createdBy: { name: string };
  _count: { items: number };
  isInvoice?: boolean;
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const qc = useQueryClient();

  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100", ...(statusFilter && { status: statusFilter }) });
      return (await api.get(`/orders?${params}`)).data;
    },
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices-orders-view"],
    queryFn: async () => {
      return (await api.get(`/invoices?limit=100`)).data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, isInvoice }: { id: string; status: string; isInvoice?: boolean }) => {
      if (isInvoice) {
        return (await api.patch(`/invoices/${id}`, { status })).data;
      }
      return (await api.patch(`/orders/${id}/status`, { status })).data;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["invoices-orders-view"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update status");
    },
  });

  const isLoading = loadingOrders || loadingInvoices;

  // Normalize orders and invoices into a unified list
  const rawOrders: OrderItem[] = (ordersData?.data || []).map((o: any) => ({
    ...o,
    isInvoice: false,
  }));

  const rawInvoices: OrderItem[] = (invoicesData?.data || []).map((inv: any) => ({
    id: inv.id,
    orderNumber: inv.invoiceNumber,
    customerId: inv.customerId,
    status: inv.orderStatus || "PENDING",
    totalAmount: inv.totalAmount,
    createdAt: inv.createdAt,
    customer: inv.customer,
    createdBy: inv.createdBy,
    _count: inv._count,
    isInvoice: true,
  }));

  // Combine and sort strictly by createdAt DESCENDING (Latest First!)
  const combined = [...rawInvoices, ...rawOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Apply filters and search
  const filteredOrders = combined.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (typeFilter && o.customer?.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = o.orderNumber?.toLowerCase().includes(q);
      const shopMatch = o.customer?.shopName?.toLowerCase().includes(q);
      const ownerMatch = o.customer?.ownerName?.toLowerCase().includes(q);
      return numMatch || shopMatch || ownerMatch;
    }
    return true;
  });

  // Pagination calculation
  const totalRecords = filteredOrders.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
            Sales Orders & Dispatch
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {totalRecords} orders available • Page {safePage} of {totalPages}
          </p>
        </div>
        <Link href="/sales/new" className="btn btn-primary btn-sm">
          <Plus size={15} />
          New Sale
        </Link>
      </div>

      {/* Control Bar: Search Input, Status & Type Filters */}
      <div className="card mb-5" style={{ padding: "0.875rem 1rem" }}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "260px" }} className="flex-1">
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
              }}
            />
            <input
              type="text"
              placeholder="Search by Order #, Customer or Shop Name..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                paddingLeft: "2.25rem",
                paddingRight: searchQuery ? "2rem" : "0.75rem",
                fontSize: "0.875rem",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "0.25rem",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="flex flex-wrap gap-1" style={{ background: "var(--bg-tertiary)", padding: "3px", borderRadius: "0.5rem" }}>
              {[
                { key: "", label: "All" },
                { key: "PENDING", label: "Pending" },
                { key: "SHIPPED", label: "Shipped" },
                { key: "DELIVERED", label: "Delivered" },
                { key: "CANCELLED", label: "Cancelled" },
              ].map((s) => (
                <button
                  key={s.key}
                  className={`btn btn-xs ${statusFilter === s.key ? "btn-primary" : "btn-ghost"}`}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                  onClick={() => {
                    setStatusFilter(s.key);
                    setCurrentPage(1);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Type Pills */}
            <div className="flex gap-1" style={{ background: "var(--bg-tertiary)", padding: "3px", borderRadius: "0.5rem" }}>
              {[
                { key: "", label: "All Types" },
                { key: "WHOLESALE", label: "Wholesale" },
                { key: "RETAIL", label: "Retail" },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`btn btn-xs ${typeFilter === t.key ? "btn-dark" : "btn-ghost"}`}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                  onClick={() => {
                    setTypeFilter(t.key);
                    setCurrentPage(1);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="table-container">
        {isLoading ? (
          <div style={{ padding: "2rem" }}>
            {Array(6).fill(null).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "3rem", marginBottom: "0.5rem", borderRadius: "0.375rem" }} />
            ))}
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Type</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Fulfillment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length ? (
                  paginatedOrders.map((o: OrderItem) => {
                    const isWholesale = o.customer?.type === "WHOLESALE" || (Boolean(o.customer?.shopName) && o.customer?.type !== "RETAIL");
                    const detailHref = o.isInvoice ? `/invoices/${o.id}` : `/orders/${o.id}`;
                    return (
                      <tr key={o.id}>
                        <td>
                          <Link
                            href={detailHref}
                            className="text-[var(--brand-600)] hover:underline"
                            style={{ fontWeight: 700 }}
                          >
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td>
                          <span className={`badge ${isWholesale ? "badge-purple" : "badge-info"}`}>
                            {isWholesale ? "Wholesale" : "Retail"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          <Link href={`/customers/${o.customerId}`} className="text-[var(--text-primary)] hover:underline">
                            {o.customer?.shopName || o.customer?.ownerName || "Customer"}
                          </Link>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>{o._count?.items || 0} items</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(o.totalAmount)}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{formatDate(o.createdAt)}</td>
                        <td>
                          <StatusBadgeSelect
                            status={o.status}
                            onChange={(newStatus) => updateStatus.mutate({ id: o.id, status: newStatus, isInvoice: o.isInvoice })}
                            disabled={updateStatus.isPending}
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              title="Share via WhatsApp"
                              style={{ color: "#10b981" }}
                              onClick={() =>
                                openWhatsAppShare({
                                  customerName: o.customer?.shopName || o.customer?.ownerName,
                                  documentType: o.isInvoice ? "Tax Invoice" : "Sales Order",
                                  documentNumber: o.orderNumber,
                                  totalAmount: o.totalAmount,
                                  docUrl: `${window.location.origin}${detailHref}`,
                                })
                              }
                            >
                              <MessageCircle size={14} />
                            </button>
                            <Link
                              href={detailHref}
                              className="btn btn-ghost btn-sm btn-icon"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </Link>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              title="Download/Print PDF"
                              onClick={() => window.open(`${detailHref}?print=true`, "_blank")}
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
                    <td colSpan={8}>
                      <div className="empty-state" style={{ padding: "2rem" }}>
                        <ShoppingBag size={40} />
                        <p style={{ fontWeight: 600 }}>No orders matching search & filters</p>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: "0.5rem" }}
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("");
                            setTypeFilter("");
                            setCurrentPage(1);
                          }}
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls Footer */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.875rem 1.25rem",
                borderTop: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>Rows per page:</span>
                <select
                  className="form-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ width: "auto", padding: "0.25rem 1.75rem 0.25rem 0.625rem", fontSize: "0.8125rem" }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span style={{ marginLeft: "0.5rem" }}>
                  Showing {totalRecords ? (safePage - 1) * pageSize + 1 : 0} to{" "}
                  {Math.min(safePage * pageSize, totalRecords)} of {totalRecords} entries
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: "0.25rem 0.5rem" }}
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
                <span style={{ fontWeight: 600, padding: "0 0.5rem" }}>
                  Page {safePage} of {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: "0.25rem 0.5rem" }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
