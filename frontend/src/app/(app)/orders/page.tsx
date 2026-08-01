"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShoppingBag, Plus, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
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
  const qc = useQueryClient();

  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50", ...(statusFilter && { status: statusFilter }) });
      return (await api.get(`/orders?${params}`)).data;
    },
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices-orders-view"],
    queryFn: async () => {
      return (await api.get(`/invoices?limit=50`)).data;
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

  // Apply status & type filters
  const orders = combined.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (typeFilter && o.customer?.type !== typeFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
            Sales Orders & Dispatch
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Showing {orders.length} latest sales & dispatch orders (sorted newest first)
          </p>
        </div>
        <Link href="/sales/new" className="btn btn-primary btn-sm">
          <Plus size={15} />
          New Sale
        </Link>
      </div>

      {/* Filter Bar: Status & Customer Type */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "", label: "All Statuses" },
            { key: "PENDING", label: "Pending" },
            { key: "SHIPPED", label: "Shipped" },
            { key: "DELIVERED", label: "Delivered" },
            { key: "CANCELLED", label: "Cancelled" },
          ].map((s) => (
            <button
              key={s.key}
              className={`btn btn-sm ${statusFilter === s.key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setStatusFilter(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {[
            { key: "", label: "All Customers" },
            { key: "WHOLESALE", label: "Wholesale" },
            { key: "RETAIL", label: "Retail" },
          ].map((t) => (
            <button
              key={t.key}
              className={`btn btn-sm ${typeFilter === t.key ? "btn-dark" : "btn-ghost"}`}
              style={{ fontSize: "0.75rem" }}
              onClick={() => setTypeFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
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
              {orders.length ? (
                orders.map((o: OrderItem) => {
                  const isWholesale = o.customer?.type === "WHOLESALE";
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
                      <p style={{ fontWeight: 600 }}>No sales orders found</p>
                      <Link href="/sales/new" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }}>
                        <Plus size={14} /> Create New Sale
                      </Link>
                    </div>
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
