"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShoppingBag, Plus, Filter } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, formatDate, getOrderStatusBadge } from "@/lib/utils";
import Link from "next/link";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer: { shopName: string };
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
    onSuccess: () => { toast.success("Order status updated"); qc.invalidateQueries({ queryKey: ["orders"] }); },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>Orders</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{data?.meta?.total || 0} orders</p>
        </div>
        <Link href="/orders/new" className="btn btn-primary btn-sm w-full sm:w-auto">
          <Plus size={15} />
          New Order
        </Link>
      </div>

      {/* Status Filter */}
      <div className="grid grid-cols-4 sm:flex gap-2 mb-5">
        {["", "PENDING", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s}
            className={`btn btn-sm justify-center ${statusFilter === s ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setStatusFilter(s)}
          >
            {s || "All"}
          </button>
        ))}
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
              {data?.data?.length ? data.data.map((order: Order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/orders/${order.id}`} style={{ fontWeight: 600, color: "var(--brand-600)", textDecoration: "none" }}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td style={{ fontWeight: 500 }}>{order.customer.shopName}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{order._count.items} items</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(order.totalAmount)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{formatDate(order.createdAt)}</td>
                  <td><span className={`badge ${getOrderStatusBadge(order.status)}`}>{order.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {order.status === "PENDING" && (
                        <>
                          <button className="btn btn-sm" style={{ background: "#dcfce7", color: "#15803d", border: "none", borderRadius: "0.375rem", cursor: "pointer", padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                            onClick={() => updateStatus.mutate({ id: order.id, status: "COMPLETED" })}>
                            Complete
                          </button>
                          <button className="btn btn-sm" style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "0.375rem", cursor: "pointer", padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                            onClick={() => updateStatus.mutate({ id: order.id, status: "CANCELLED" })}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: "2rem" }}>
                      <ShoppingBag size={40} />
                      <p style={{ fontWeight: 600 }}>No orders found</p>
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
