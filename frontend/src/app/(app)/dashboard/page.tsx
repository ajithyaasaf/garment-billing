"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Receipt,
  Users,
  DollarSign,
  ShoppingBag,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "@/lib/api";
import { formatCurrency, formatDate, getPaymentStatusBadge } from "@/lib/utils";

function CustomDashboardTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "white",
        border: "1px solid var(--border-color)",
        padding: "0.75rem 1rem",
        borderRadius: "0.625rem",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
      }}>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          {new Date(label).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9375rem", color: "var(--brand-600)", fontWeight: 700 }}>
          {formatCurrency(payload[0].value)} Sales
        </p>
      </div>
    );
  }
  return null;
}

interface DashboardData {
  todaySales: { total: number; count: number };
  monthlySales: { total: number; count: number };
  lowStockCount: number;
  recentInvoices: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paymentStatus: string;
    invoiceDate: string;
    customer: { shopName: string };
  }[];
  recentQuotations: {
    id: string;
    quotationNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    customer: { shopName: string };
  }[];
  outstandingPayments: { total: number; count: number };
  totalCustomers: number;
  topProducts: { productName: string; _sum: { quantity: number } }[];
  totalProducts: number;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="stat-card"
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p className="stat-label">{title}</p>
          <p className="stat-value" style={{ marginTop: "0.5rem" }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="stat-icon"
          style={{ background: `${color}15`, color }}
        >
          <Icon size={18} />
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton" style={{ height: "0.875rem", width: "60%", marginBottom: "0.75rem" }} />
      <div className="skeleton" style={{ height: "1.75rem", width: "80%" }} />
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get("/dashboard");
      return res.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: salesTrend, isLoading: isSalesLoading } = useQuery({
    queryKey: ["dashboard-sales-trend"],
    queryFn: async () => {
      const res = await api.get("/reports/sales-daily?days=7");
      return res.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <div className="skeleton" style={{ height: "1.5rem", width: "200px", marginBottom: "0.5rem" }} />
          <div className="skeleton" style={{ height: "0.875rem", width: "300px" }} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {Array(6).fill(null).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Today's Sales",
      value: formatCurrency(data?.todaySales.total || 0),
      subtitle: `${data?.todaySales.count || 0} invoices`,
      icon: DollarSign,
      color: "#10b981",
    },
    {
      title: "Monthly Sales",
      value: formatCurrency(data?.monthlySales.total || 0),
      subtitle: `${data?.monthlySales.count || 0} invoices`,
      icon: TrendingUp,
      color: "#3b82f6",
    },
    {
      title: "Outstanding",
      value: formatCurrency(data?.outstandingPayments.total || 0),
      subtitle: `${data?.outstandingPayments.count || 0} pending`,
      icon: TrendingDown,
      color: "#ef4444",
    },
    {
      title: "Low Stock Items",
      value: String(data?.lowStockCount || 0),
      subtitle: "Variants below min",
      icon: AlertTriangle,
      color: "#f59e0b",
    },
    {
      title: "Total Customers",
      value: String(data?.totalCustomers || 0),
      subtitle: "Active customers",
      icon: Users,
      color: "#6366f1",
    },
    {
      title: "Total Products",
      value: String(data?.totalProducts || 0),
      subtitle: "In inventory",
      icon: Package,
      color: "#ec4899",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.375rem",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            marginBottom: "0.25rem",
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {stats.map((stat, i) => (
          <StatCard key={stat.title} {...stat} delay={i * 0.06} />
        ))}
      </div>

      {/* Sales Trend Chart (Full Width) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card"
        style={{ marginBottom: "1.5rem" }}
      >
        <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp size={16} color="var(--brand-600)" />
            <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Sales Performance (Last 7 Days)</span>
          </div>
          <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontWeight: 600 }}>7 days</span>
        </div>
        <div className="card-body" style={{ padding: "1.25rem 1.25rem 0.5rem 1.25rem" }}>
          {isSalesLoading ? (
            <div className="skeleton" style={{ height: "220px", width: "100%" }} />
          ) : salesTrend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-600)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--brand-600)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                  tickFormatter={(v) => {
                    try {
                      const d = new Date(v);
                      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                    } catch {
                      return v;
                    }
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomDashboardTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--brand-600)"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                  name="Sales Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "180px", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
              No sales data recorded in the last 7 days.
            </div>
          )}
        </div>
      </motion.div>

      {/* Two-column bottom */}
      <div
        className="dashboard-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        {/* Recent Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div
            className="card-header"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Receipt size={16} color="var(--brand-600)" />
              <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Recent Invoices</span>
            </div>
            <a href="/invoices" style={{ fontSize: "0.75rem", color: "var(--brand-600)", textDecoration: "none" }}>
              View all →
            </a>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentInvoices?.length ? (
                  data.recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <a
                          href={`/invoices/${inv.id}`}
                          style={{ color: "var(--brand-600)", textDecoration: "none", fontWeight: 500 }}
                        >
                          {inv.invoiceNumber}
                        </a>
                        <br />
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                          {formatDate(inv.invoiceDate)}
                        </span>
                      </td>
                      <td>{inv.customer.shopName}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(inv.totalAmount)}</td>
                      <td>
                        <span className={`badge ${getPaymentStatusBadge(inv.paymentStatus)}`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="empty-state" style={{ padding: "2rem" }}>
                      No invoices yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Top Products + Quick Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Top Selling */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <div className="card-header" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShoppingBag size={16} color="var(--brand-600)" />
              <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Top Selling Products</span>
            </div>
            <div className="card-body" style={{ padding: "1rem" }}>
              {data?.topProducts?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {data.topProducts.slice(0, 5).map((p, i) => (
                    <div
                      key={p.productName}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "1.75rem",
                          height: "1.75rem",
                          borderRadius: "0.375rem",
                          background: "var(--bg-tertiary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--brand-600)",
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>
                      <span style={{ flex: 1, fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.productName}
                      </span>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0 }}>
                        {p._sum.quantity} pcs
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>
                  No sales data yet
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="card"
          >
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Quick Actions</span>
            </div>
            <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
              {[
                { label: "New Invoice", href: "/invoices/new", color: "#3b82f6" },
                { label: "New Quotation", href: "/quotations/new", color: "#6366f1" },
                { label: "Add Product", href: "/inventory/new", color: "#10b981" },
                { label: "Add Customer", href: "/customers/new", color: "#f59e0b" },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.75rem",
                    background: `${action.color}10`,
                    border: `1px solid ${action.color}25`,
                    borderRadius: "0.625rem",
                    color: action.color,
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.15s",
                    cursor: "pointer",
                  }}
                >
                  {action.label}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile responsive override */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
