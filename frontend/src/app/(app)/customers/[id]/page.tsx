"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit, Phone, MapPin, Trash2, CheckCircle, Clock, AlertCircle, ShoppingCart, DollarSign, Wallet } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, formatDate, generateWhatsAppLink } from "@/lib/utils";
import Link from "next/link";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params.id as string;

  const { data: customer, isLoading: isLoadingCustomer, error, refetch } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => (await api.get(`/customers/${id}`)).data,
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["customer-analytics", id],
    queryFn: async () => (await api.get(`/customers/${id}/analytics`)).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => await api.delete(`/customers/${id}`),
    onSuccess: () => {
      toast.success("Customer deleted successfully!");
      qc.invalidateQueries({ queryKey: ["customers"] });
      router.push("/customers");
    },
    onError: () => {
      toast.error("Failed to delete customer");
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this customer?")) {
      deleteMutation.mutate();
    }
  };

  if (isLoadingCustomer || isLoadingAnalytics) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="skeleton" style={{ width: "200px", height: "1.5rem", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ width: "100%", height: "300px" }} />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--danger)", fontWeight: 600 }}>Customer not found or failed to load.</p>
        <Link href="/customers" className="btn btn-secondary" style={{ marginTop: "1rem" }}>Back to Customers</Link>
      </div>
    );
  }

  const outstanding = customer.outstandingBalance || 0;
  const limitPercent = Math.min(100, Math.round((outstanding / (customer.creditLimit || 1)) * 100));

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="btn btn-ghost btn-sm btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{customer.shopName}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Proprietor: {customer.ownerName}</p>
          </div>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          <Link href={`/customers/${id}/edit`} className="btn btn-secondary btn-sm flex-1 sm:flex-initial justify-center">
            <Edit size={14} />
            Edit Customer
          </Link>
          <a
            href={generateWhatsAppLink(customer.whatsapp, `Dear ${customer.ownerName},\nThis is regarding...`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm flex-1 sm:flex-initial justify-center"
            style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <Phone size={14} />
            WhatsApp
          </a>
          <button className="btn btn-secondary btn-sm flex-1 sm:flex-initial justify-center" style={{ color: "var(--danger)" }} onClick={handleDelete} disabled={deleteMutation.isPending}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Left Column - History Tables */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Recent Invoices */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Recent Invoices</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Last 10 invoices</span>
            </div>
            <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.invoices?.length > 0 ? (
                    customer.invoices.map((inv: any) => (
                      <tr key={inv.id}>
                        <td>
                          <Link href={`/invoices/${inv.id}`} style={{ fontWeight: 600, color: "var(--brand-600)", textDecoration: "none" }}>
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td>{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-IN")}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(inv.totalAmount)}</td>
                        <td>
                          <span className={`badge ${inv.paymentStatus === "PAID" ? "badge-success" : inv.paymentStatus === "PARTIAL" ? "badge-warning" : "badge-danger"
                            }`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="empty-state" style={{ textAlign: "center", padding: "1.5rem" }}>
                        No invoices created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Quotations */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Recent Quotations</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Last 5 quotations</span>
            </div>
            <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Quotation #</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.quotations?.length > 0 ? (
                    customer.quotations.map((quo: any) => (
                      <tr key={quo.id}>
                        <td>
                          <Link href={`/quotations/${quo.id}`} style={{ fontWeight: 600, color: "var(--brand-600)", textDecoration: "none" }}>
                            {quo.quotationNumber}
                          </Link>
                        </td>
                        <td>{new Date(quo.createdAt).toLocaleDateString("en-IN")}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(quo.totalAmount)}</td>
                        <td>
                          <span className={`badge ${quo.status === "CONVERTED" ? "badge-success" : "badge-gray"
                            }`}>
                            {quo.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="empty-state" style={{ textAlign: "center", padding: "1.5rem" }}>
                        No quotations created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Analytics and Details */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Financial Metrics */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600 }}>Account Balance</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyItems: "center", flexShrink: 0, justifyContent: "center" }}>
                  <Wallet size={18} color="var(--danger)" />
                </div>
                <div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Outstanding Dues</p>
                  <p style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--danger)" }}>{formatCurrency(outstanding)}</p>
                </div>
              </div>

              {/* Progress limit bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  <span>Credit Usage</span>
                  <span>Limit: {formatCurrency(customer.creditLimit)}</span>
                </div>
                <div style={{ height: "6px", width: "100%", background: "var(--border-color)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${limitPercent}%`, background: limitPercent > 80 ? "var(--danger)" : "var(--brand-600)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Analytics */}
          {analytics && (
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.875rem" }}>Customer Analytics</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div style={{ background: "var(--bg-tertiary)", padding: "0.75rem", borderRadius: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                    <ShoppingCart size={13} />
                    <span>Invoices</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: "1.125rem", marginTop: "0.25rem" }}>{analytics.invoiceCount}</p>
                </div>
                <div style={{ background: "var(--bg-tertiary)", padding: "0.75rem", borderRadius: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                    <DollarSign size={13} />
                    <span>Total Sales</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: "1.125rem", marginTop: "0.25rem" }}>{formatCurrency(analytics.totalPurchases)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Client Details */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600 }}>Customer Details</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8125rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Owner:</span>
                <span style={{ fontWeight: 600 }}>{customer.ownerName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>WhatsApp:</span>
                <span style={{ fontWeight: 600 }}>{customer.whatsapp}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>GSTIN:</span>
                <span style={{ fontWeight: 600 }}>{customer.gstNumber || "Unregistered (B2C)"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <span style={{ color: "var(--text-secondary)" }}>Billing Address:</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>
                  {customer.address || "No address provided"},<br />
                  {customer.city}, {customer.state}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
