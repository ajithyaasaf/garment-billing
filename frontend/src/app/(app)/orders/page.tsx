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

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer: { shopName?: string; ownerName?: string };
  createdBy: { name: string };
  _count: { items: number };
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50", ...(statusFilter && { status: statusFilter }) });
      return (await api.get(`/orders?${params}`)).data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/orders/${id}/status`, { status })).data,
    onSuccess: () => {
      toast.success("Order status updated");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update order status");
    },
  });

  const orders = data?.data || [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
            Sales Orders
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {data?.meta?.total || 0} active sales orders
          </p>
        </div>
        <Link href="/sales/new" className="btn btn-primary btn-sm">
          <Plus size={15} />
          New Sale
        </Link>
      </div>

      {/* Clean Status Filter Bar */}
      <div className="grid grid-cols-5 sm:flex gap-2 mb-5">
        {[
          { key: "", label: "All" },
          { key: "PENDING", label: "Pending" },
          { key: "SHIPPED", label: "Shipped" },
          { key: "DELIVERED", label: "Delivered" },
          { key: "CANCELLED", label: "Cancelled" },
        ].map((s) => (
          <button
            key={s.key}
            className={`btn btn-sm justify-center ${statusFilter === s.key ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setStatusFilter(s.key)}
          >
            {s.label}
          </button>
        ))}
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
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((o: Order) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-[var(--brand-600)] hover:underline"
                        style={{ fontWeight: 700 }}
                      >
                        {o.orderNumber}
                      </Link>
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
                        onChange={(newStatus) => updateStatus.mutate({ id: o.id, status: newStatus })}
                        disabled={updateStatus.isPending}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        <Link
                          href={`/orders/${o.id}`}
                          className="btn btn-ghost btn-sm btn-icon"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Download/Print PDF"
                          onClick={() => window.open(`/orders/${o.id}?print=true`, "_blank")}
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
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
