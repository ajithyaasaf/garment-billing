"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, DollarSign, Users, Package, Download, BarChart3 } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";

const COLORS = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "customers" | "gst" | "outstanding" | "profit">("overview");

  const { data: dailySales } = useQuery({
    queryKey: ["report-daily"],
    queryFn: async () => (await api.get("/reports/sales-daily?days=30")).data,
  });

  const { data: monthlySales } = useQuery({
    queryKey: ["report-monthly"],
    queryFn: async () => (await api.get(`/reports/sales-monthly?year=${new Date().getFullYear()}`)).data,
  });

  const { data: productSales } = useQuery({
    queryKey: ["report-products"],
    queryFn: async () => (await api.get("/reports/product-sales?limit=10")).data,
  });

  const { data: customerSales } = useQuery({
    queryKey: ["report-customers"],
    queryFn: async () => (await api.get("/reports/customer-sales")).data,
  });

  const { data: outstanding } = useQuery({
    queryKey: ["report-outstanding"],
    queryFn: async () => (await api.get("/reports/outstanding")).data,
  });

  const { data: profit } = useQuery({
    queryKey: ["report-profit"],
    queryFn: async () => (await api.get("/reports/profit")).data,
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "products", label: "Products" },
    { key: "customers", label: "Customers" },
    { key: "outstanding", label: "Outstanding" },
    { key: "profit", label: "Profit" },
    { key: "gst", label: "GST" },
  ] as const;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>Reports & Analytics</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Business intelligence overview</p>
        </div>
        <button className="btn btn-secondary btn-sm">
          <Download size={15} />
          Export Report
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.625rem", padding: "0.25rem", marginBottom: "1.5rem", overflowX: "auto" }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: "0.5rem",
              border: "none",
              background: activeTab === tab.key ? "var(--brand-600)" : "transparent",
              color: activeTab === tab.key ? "white" : "var(--text-secondary)",
              fontWeight: activeTab === tab.key ? 600 : 500,
              fontSize: "0.8125rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Profit summary cards */}
          {profit && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              {[
                { label: "Total Revenue", value: formatCurrency(profit.revenue), icon: TrendingUp, color: "#3b82f6" },
                { label: "Cost of Goods", value: formatCurrency(profit.costOfGoods), icon: Package, color: "#f59e0b" },
                { label: "Gross Profit", value: formatCurrency(profit.grossProfit), icon: DollarSign, color: "#10b981" },
                { label: "Profit Margin", value: `${profit.profitMargin}%`, icon: BarChart3, color: "#6366f1" },
              ].map((card) => (
                <div key={card.label} className="stat-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p className="stat-label">{card.label}</p>
                      <p className="stat-value" style={{ marginTop: "0.5rem" }}>{card.value}</p>
                    </div>
                    <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color }}>
                      <card.icon size={18} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Monthly Revenue Chart */}
          {monthlySales && (
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Monthly Revenue – {new Date().getFullYear()}</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlySales.map((m: { month: number; revenue: number; collected: number }) => ({ ...m, name: monthNames[m.month - 1] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} labelStyle={{ color: "var(--text-primary)" }} contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.5rem" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f615" strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="collected" stroke="#10b981" fill="#10b98115" strokeWidth={2} name="Collected" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Daily Sales (last 30d) */}
          {dailySales && (
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Daily Sales – Last 30 Days</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.5rem" }} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "products" && productSales && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 600 }}>Top Selling Products</span></div>
            <div className="card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {productSales.map((p: { productName: string; _sum: { quantity: number; totalAmount: number } }, i: number) => (
                  <div key={p.productName} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "1.75rem", height: "1.75rem", borderRadius: "0.375rem", background: `${COLORS[i % COLORS.length]}15`, color: COLORS[i % COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem" }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.productName}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{formatNumber(p._sum.quantity || 0)} units sold</div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(p._sum.totalAmount || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 600 }}>Sales by Product</span></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={productSales.slice(0, 5).map((p: { productName: string; _sum: { totalAmount: number } }) => ({ name: p.productName, value: p._sum.totalAmount || 0 }))}
                    cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${(name || "").slice(0, 12)} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {productSales.slice(0, 5).map((_: unknown, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.5rem" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "customers" && customerSales && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1}} className="card">
          <div className="card-header"><span style={{ fontWeight: 600 }}>Customer-wise Sales</span></div>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Shop Name</th>
                  <th>City</th>
                  <th>Total Purchases</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {customerSales.map((c: { customerId: string; shopName: string; city: string; _sum: { totalAmount: number; paidAmount: number; dueAmount: number }; _count: number }, i: number) => (
                  <tr key={c.customerId}>
                    <td style={{ color: "var(--text-tertiary)" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.shopName}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{c.city}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(c._sum.totalAmount || 0)}</td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(c._sum.paidAmount || 0)}</td>
                    <td style={{ color: (c._sum.dueAmount || 0) > 0 ? "var(--danger)" : "var(--text-tertiary)", fontWeight: 600 }}>{formatCurrency(c._sum.dueAmount || 0)}</td>
                    <td>{c._count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === "outstanding" && outstanding && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {[
              { label: "Total Outstanding", value: formatCurrency(outstanding.total), color: "#ef4444" },
              { label: "Outstanding Invoices", value: outstanding.count, color: "#f59e0b" },
              { label: "Avg Outstanding", value: outstanding.count ? formatCurrency(outstanding.total / outstanding.count) : "₹0", color: "#6366f1" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <p className="stat-label">{s.label}</p>
                <p className="stat-value" style={{ color: s.color, marginTop: "0.5rem" }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 600 }}>Outstanding Invoices</span></div>
            <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr><th>Invoice #</th><th>Customer</th><th>City</th><th>Total</th><th>Due</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {outstanding.invoices?.map((inv: { id: string; invoiceNumber: string; customer: { shopName: string; whatsapp: string; city: string }; totalAmount: number; dueAmount: number; paymentStatus: string }) => (
                    <tr key={inv.id}>
                      <td><a href={`/invoices/${inv.id}`} style={{ color: "var(--brand-600)", textDecoration: "none", fontWeight: 600 }}>{inv.invoiceNumber}</a></td>
                      <td style={{ fontWeight: 500 }}>{inv.customer.shopName}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{inv.customer.city}</td>
                      <td>{formatCurrency(inv.totalAmount)}</td>
                      <td style={{ fontWeight: 700, color: "var(--danger)" }}>{formatCurrency(inv.dueAmount)}</td>
                      <td><span className="badge badge-warning">{inv.paymentStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "profit" && profit && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>P&L Summary</h3>
              {[
                { label: "Total Revenue", value: profit.revenue, color: "#3b82f6" },
                { label: "Cost of Goods Sold", value: profit.costOfGoods, color: "#f59e0b" },
                { label: "Gross Profit", value: profit.grossProfit, color: "#10b981" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: row.color }}>{formatCurrency(row.value)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", marginTop: "0.25rem" }}>
                <span style={{ fontWeight: 700 }}>Profit Margin</span>
                <span style={{ fontWeight: 800, color: "#10b981", fontSize: "1.125rem" }}>{profit.profitMargin}%</span>
              </div>
            </div>
            <div className="card card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[{ name: "Gross Profit", value: profit.grossProfit }, { name: "Cost", value: profit.costOfGoods }]}
                    cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.5rem" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "gst" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>GST Report</span>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Month</label>
                <select className="form-input form-select">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select className="form-input form-select">
                  {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: "1rem" }}>Generate GST Report</button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
