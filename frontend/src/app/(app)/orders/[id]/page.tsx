"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Printer, FileCheck, Calendar, User, ShoppingCart, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params.id as string;

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await api.get(`/orders/${id}`)).data,
  });

  const { data: business } = useQuery({
    queryKey: ["business-profile"],
    queryFn: async () => (await api.get("/settings/business")).data,
  });

  const convertMutation = useMutation({
    mutationFn: async () => (await api.post(`/orders/${id}/convert`)).data,
    onSuccess: (invoice) => {
      toast.success("Order converted to Invoice successfully!");
      qc.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/invoices/${invoice.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to convert order to invoice");
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED": return "badge-success";
      case "PENDING": return "badge-warning";
      case "CANCELLED": return "badge-danger";
      default: return "badge-secondary";
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="skeleton" style={{ width: "200px", height: "1.5rem", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ width: "100%", height: "300px" }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--danger)", fontWeight: 600 }}>Order not found or failed to load.</p>
        <Link href="/orders" className="btn btn-secondary" style={{ marginTop: "1rem" }}>Back to Orders</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Header and Actions (Hidden during print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/orders" className="btn btn-ghost btn-sm btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Sales Order</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Manage order details</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            Print
          </button>

          {order.status === "PENDING" && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
            >
              <FileCheck size={14} />
              Convert to Invoice
            </button>
          )}
        </div>
      </div>

      {/* Printable Sheet */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card print-sheet" style={{ padding: "2.5rem" }}>
        {/* Print Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-600)", textTransform: "uppercase" }}>
              {business?.name || "GARMENTOS ERP"}
            </h2>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              {business?.address ? (
                <>
                  {business.address}, {business.city && `${business.city}, `}{business.state || "Tamil Nadu"} {business.pincode && `- ${business.pincode}`}
                </>
              ) : (
                "Madurai, Tamil Nadu, India"
              )}
              {business?.gstNumber && (
                <div style={{ marginTop: "0.125rem" }}>
                  <strong>GSTIN:</strong> {business.gstNumber}
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>SALES ORDER</h2>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginTop: "0.25rem" }}>{order.orderNumber}</p>
            <span className={`badge ${getOrderStatusBadge(order.status)}`} style={{ marginTop: "0.5rem", display: "inline-block" }}>
              {order.status}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2.5rem" }}>
          <div>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Customer Details</p>
            <p style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{order.customer.shopName}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>Prop: {order.customer.ownerName}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>GSTIN: {order.customer.gstNumber || "N/A"}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>{order.customer.city}, {order.customer.state || "Tamil Nadu"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Order Info</p>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
              <Calendar size={13} />
              <span>Date: {formatDate(order.createdAt)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
              <User size={13} />
              <span>Taken By: {order.createdBy.name}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="table-container" style={{ border: "none", borderRadius: 0, marginBottom: "2rem" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem" }}>Product Description</th>
                <th style={{ textAlign: "center", padding: "0.75rem 0.5rem" }}>Variant</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0.5rem" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0.5rem" }}>Rate</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0.5rem" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item: any, idx: number) => (
                <tr key={item.id || idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{item.productName}</div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>{item.product?.sku}</div>
                  </td>
                  <td style={{ textAlign: "center", padding: "0.75rem 0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {item.variant ? `${item.variant.color} / ${item.variant.size}` : "-"}
                  </td>
                  <td style={{ textAlign: "right", padding: "0.75rem 0.5rem", fontSize: "0.875rem" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right", padding: "0.75rem 0.5rem", fontSize: "0.875rem" }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ textAlign: "right", padding: "0.75rem 0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>{formatCurrency(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <div style={{ width: "300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>Grand Total:</span>
              <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--brand-600)" }}>{formatCurrency(order.totalAmount)}</span>
            </div>
            <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textAlign: "right", marginTop: "0.25rem" }}>
              * GST will be applied during invoice conversion
            </p>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div style={{ marginTop: "3rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Notes</h4>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{order.notes}</p>
            </div>
          </div>
        )}
      </motion.div>

      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
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
