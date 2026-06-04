"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, DollarSign, Users, Package, Download, BarChart3, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];

// Premium custom tooltip components
function CustomMonthlyTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "white",
        border: "1px solid var(--border-color)",
        padding: "0.75rem 1rem",
        borderRadius: "0.625rem",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
      }}>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>{label}</p>
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#3b82f6", fontWeight: 700 }}>
          Revenue: {formatCurrency(payload[0].value)}
        </p>
        {payload[1] && (
          <p style={{ margin: "0.125rem 0 0 0", fontSize: "0.875rem", color: "#10b981", fontWeight: 700 }}>
            Collected: {formatCurrency(payload[1].value)}
          </p>
        )}
      </div>
    );
  }
  return null;
}

function CustomDailyTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "white",
        border: "1px solid var(--border-color)",
        padding: "0.75rem 1rem",
        borderRadius: "0.625rem",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
      }}>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</p>
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9375rem", color: "#3b82f6", fontWeight: 700 }}>
          Sales: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

function CustomPieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "white",
        border: "1px solid var(--border-color)",
        padding: "0.75rem 1rem",
        borderRadius: "0.625rem",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
      }}>
        <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>{payload[0].name}</p>
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--brand-600)", fontWeight: 700 }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "customers" | "gst" | "outstanding" | "profit">("overview");
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data: gstData, isLoading: isLoadingGst, isFetching: isFetchingGst, refetch: refetchGst } = useQuery({
    queryKey: ["report-gst", selectedMonth, selectedYear],
    queryFn: async () => (await api.get(`/reports/gst?month=${selectedMonth}&year=${selectedYear}`)).data,
    enabled: activeTab === "gst",
  });

  const { data: dailySales, isLoading: isLoadingDaily } = useQuery({
    queryKey: ["report-daily"],
    queryFn: async () => (await api.get("/reports/sales-daily?days=30")).data,
    enabled: activeTab === "overview",
  });

  const { data: monthlySales, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ["report-monthly"],
    queryFn: async () => (await api.get(`/reports/sales-monthly?year=${new Date().getFullYear()}`)).data,
    enabled: activeTab === "overview",
  });

  const { data: productSales, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["report-products"],
    queryFn: async () => (await api.get("/reports/product-sales?limit=10")).data,
    enabled: activeTab === "products",
  });

  const { data: customerSales, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["report-customers"],
    queryFn: async () => (await api.get("/reports/customer-sales")).data,
    enabled: activeTab === "customers",
  });

  const { data: outstanding, isLoading: isLoadingOutstanding } = useQuery({
    queryKey: ["report-outstanding"],
    queryFn: async () => (await api.get("/reports/outstanding")).data,
    enabled: activeTab === "outstanding",
  });

  const { data: profit, isLoading: isLoadingProfit } = useQuery({
    queryKey: ["report-profit"],
    queryFn: async () => (await api.get("/reports/profit")).data,
    enabled: activeTab === "overview" || activeTab === "profit",
  });

  const handleExport = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `report_${activeTab}.csv`;

    if (activeTab === "gst" && gstData) {
      filename = `GSTR1_Report_${selectedMonth}_${selectedYear}.csv`;
      headers = [
        "Invoice Number",
        "Invoice Date",
        "Customer Name",
        "GSTIN",
        "Place of Supply (State)",
        "Taxable Value (INR)",
        "CGST (INR)",
        "SGST (INR)",
        "IGST (INR)",
        "Total Invoice Value (INR)"
      ];
      rows = (gstData.invoices || []).map((inv: any) => [
        inv.invoiceNumber,
        new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
        inv.customer,
        inv.gstNumber || "URP",
        inv.state || "Tamil Nadu",
        inv.taxableAmount.toString(),
        inv.cgst.toString(),
        inv.sgst.toString(),
        inv.igst.toString(),
        inv.totalAmount.toString()
      ]);
    } else if (activeTab === "products" && productSales) {
      filename = `Product_Sales_Report.csv`;
      headers = ["Product Name", "Quantity Sold", "Total Sales Value (INR)"];
      rows = productSales.map((item: any) => [
        item.productName,
        item._sum.quantity.toString(),
        item._sum.totalAmount.toString()
      ]);
    } else if (activeTab === "customers" && customerSales) {
      filename = `Customer_Sales_Report.csv`;
      headers = ["Customer Shop Name", "City", "Total Sales Value (INR)", "Total Paid (INR)", "Total Due (INR)", "Invoice Count"];
      rows = customerSales.map((item: any) => [
        item.shopName || "Unknown",
        item.city || "Unknown",
        item._sum.totalAmount.toString(),
        item._sum.paidAmount.toString(),
        item._sum.dueAmount.toString(),
        item._count.toString()
      ]);
    } else if (activeTab === "outstanding" && outstanding) {
      filename = `Outstanding_Invoices_Report.csv`;
      headers = ["Invoice Number", "Customer Name", "City", "Total Amount (INR)", "Due Amount (INR)", "Payment Status"];
      rows = (outstanding.invoices || []).map((inv: any) => [
        inv.invoiceNumber,
        inv.customer.shopName,
        inv.customer.city,
        inv.totalAmount.toString(),
        inv.dueAmount.toString(),
        inv.paymentStatus
      ]);
    } else if (activeTab === "profit" && profit) {
      filename = `Profit_Loss_Report.csv`;
      headers = ["Metric", "Amount (INR)"];
      rows = [
        ["Total Revenue", profit.revenue.toString()],
        ["Cost of Goods Sold", profit.costOfGoods.toString()],
        ["Gross Profit", profit.grossProfit.toString()],
        ["Profit Margin (%)", `${profit.profitMargin}%`]
      ];
    } else if (activeTab === "overview" && dailySales) {
      filename = `Daily_Sales_Trend.csv`;
      headers = ["Date", "Revenue (INR)", "Collected (INR)", "Invoice Count"];
      rows = dailySales.map((item: any) => [
        item.date,
        item.revenue.toString(),
        item.collected.toString(),
        item.count.toString()
      ]);
    } else {
      return;
    }

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleExport}
          disabled={
            (activeTab === "overview" && !dailySales) ||
            (activeTab === "products" && !productSales) ||
            (activeTab === "customers" && !customerSales) ||
            (activeTab === "outstanding" && !outstanding) ||
            (activeTab === "profit" && !profit) ||
            (activeTab === "gst" && !gstData)
          }
        >
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

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Profit summary cards */}
          {isLoadingProfit ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="stat-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", width: "70%" }}>
                      <div className="skeleton" style={{ width: "90px", height: "0.75rem" }} />
                      <div className="skeleton" style={{ width: "130px", height: "1.5rem", marginTop: "0.25rem" }} />
                    </div>
                    <div className="skeleton" style={{ width: "2.5rem", height: "2.5rem", borderRadius: "var(--radius-lg)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : profit ? (
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
          ) : null}

          {/* Monthly Revenue Chart */}
          {isLoadingMonthly ? (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
              <div className="skeleton" style={{ width: "200px", height: "1rem" }} />
              <div className="skeleton" style={{ width: "100%", height: "280px" }} />
            </div>
          ) : monthlySales ? (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Monthly Revenue – {new Date().getFullYear()}</span>
                <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontWeight: 600 }}>12 months</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlySales.map((m: { month: number; revenue: number; collected: number }) => ({ ...m, name: monthNames[m.month - 1] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomMonthlyTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f615" strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="collected" stroke="#10b981" fill="#10b98115" strokeWidth={2} name="Collected" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          {/* Daily Sales (last 30d) */}
          {isLoadingDaily ? (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
              <div className="skeleton" style={{ width: "180px", height: "1rem" }} />
              <div className="skeleton" style={{ width: "100%", height: "220px" }} />
            </div>
          ) : dailySales ? (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Daily Sales – Last 30 Days</span>
                <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontWeight: 600 }}>30 days</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip cursor={{ fill: "rgba(0, 0, 0, 0.02)" }} content={<CustomDailyTooltip />} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Revenue" barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        isLoadingProducts ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="skeleton" style={{ width: "150px", height: "1rem" }} />
              {Array(6).fill(null).map((_, i) => (
                <div key={i} className="skeleton" style={{ width: "100%", height: "2rem" }} />
              ))}
            </div>
            <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="skeleton" style={{ width: "150px", height: "1rem" }} />
              <div className="skeleton" style={{ width: "100%", height: "240px" }} />
            </div>
          </div>
        ) : productSales ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Top Selling Products</span>
                <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", fontWeight: 600 }}>{productSales.length} items</span>
              </div>
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
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Sales by Product</span>
                <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", fontWeight: 600 }}>Top 5</span>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={productSales.slice(0, 5).map((p: { productName: string; _sum: { totalAmount: number } }) => ({ name: p.productName, value: p._sum.totalAmount || 0 }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {productSales.slice(0, 5).map((_: unknown, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom dot-based legend positioned below the donut chart */}
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem", marginTop: "1rem" }}>
                  {productSales.slice(0, 5).map((p: any, idx: number) => (
                    <div key={p.productName} style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS[idx % COLORS.length] }} />
                      <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{p.productName.slice(0, 14)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null
      )}

      {/* Customers Tab */}
      {activeTab === "customers" && (
        isLoadingCustomers ? (
          <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="skeleton" style={{ width: "180px", height: "1.25rem" }} />
            {Array(8).fill(null).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: "100%", height: "2.5rem" }} />
            ))}
          </div>
        ) : customerSales ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Customer-wise Sales</span>
              <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", fontWeight: 600 }}>{customerSales.length} active</span>
            </div>
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
        ) : null
      )}

      {/* Outstanding Tab */}
      {activeTab === "outstanding" && (
        isLoadingOutstanding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div className="skeleton" style={{ width: "100px", height: "0.75rem" }} />
                  <div className="skeleton" style={{ width: "140px", height: "1.5rem", marginTop: "0.25rem" }} />
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="skeleton" style={{ width: "160px", height: "1rem" }} />
              {Array(6).fill(null).map((_, i) => (
                <div key={i} className="skeleton" style={{ width: "100%", height: "2.25rem" }} />
              ))}
            </div>
          </div>
        ) : outstanding ? (
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
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Outstanding Invoices</span>
                <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontWeight: 600 }}>{outstanding.count} invoices</span>
              </div>
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
        ) : null
      )}

      {/* Profit Tab */}
      {activeTab === "profit" && (
        isLoadingProfit ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
            <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="skeleton" style={{ width: "120px", height: "1.25rem" }} />
              {Array(4).fill(null).map((_, i) => (
                <div key={i} className="skeleton" style={{ width: "100%", height: "2.5rem" }} />
              ))}
            </div>
            <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="skeleton" style={{ width: "120px", height: "1.25rem" }} />
              <div className="skeleton" style={{ width: "100%", height: "220px" }} />
            </div>
          </div>
        ) : profit ? (
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
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[{ name: "Gross Profit", value: profit.grossProfit }, { name: "Cost", value: profit.costOfGoods }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom dot-based legend positioned below the P&L donut chart */}
                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Gross Profit</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Cost</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null
      )}

      {/* GST Tab */}
      {activeTab === "gst" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>GST Report Filter</span>
              <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontWeight: 600 }}>Monthly Filing</span>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <select
                    className="form-input form-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select
                    className="form-input form-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                onClick={async () => {
                  const { data } = await refetchGst();
                  if (data) {
                    const monthName = new Date(0, selectedMonth - 1).toLocaleString("default", { month: "long" });
                    toast.success(`GST Report generated successfully for ${monthName} ${selectedYear}!`);
                  }
                }}
                disabled={isFetchingGst}
              >
                {isFetchingGst && <Loader2 size={14} className="animate-spin" />}
                Generate GST Report
              </button>
            </div>
          </div>

          {isLoadingGst ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="card" style={{ padding: "1.25rem" }}>
                    <div className="skeleton" style={{ width: "80px", height: "0.75rem", marginBottom: "0.5rem" }} />
                    <div className="skeleton" style={{ width: "120px", height: "1.5rem" }} />
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: "1.5rem" }}>
                <div className="skeleton" style={{ width: "150px", height: "1.25rem", marginBottom: "1rem" }} />
                {Array(5).fill(null).map((_, i) => (
                  <div key={i} className="skeleton" style={{ width: "100%", height: "2rem", marginBottom: "0.5rem" }} />
                ))}
              </div>
            </div>
          ) : gstData && gstData.totals ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Totals Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
                {[
                  { label: "Taxable Value", value: gstData.totals.taxable, color: "#3b82f6" },
                  { label: "CGST (Central)", value: gstData.totals.cgst, color: "#f59e0b" },
                  { label: "SGST (State)", value: gstData.totals.sgst, color: "#f59e0b" },
                  { label: "IGST (Integrated)", value: gstData.totals.igst, color: "#6366f1" },
                  { label: "Total GST Tax", value: gstData.totals.gst, color: "#10b981" },
                ].map((s) => (
                  <div key={s.label} className="stat-card">
                    <p className="stat-label">{s.label}</p>
                    <p className="stat-value" style={{ color: s.color, marginTop: "0.5rem" }}>{formatCurrency(s.value)}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.25rem", alignItems: "start" }}>
                {/* GST Slab Breakdown */}
                <div className="card">
                  <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>Slab Breakdown</span>
                    <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", fontWeight: 600 }}>Rates</span>
                  </div>
                  <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Rate</th>
                          <th>Taxable</th>
                          <th>GST Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gstData.gstBreakdown?.length ? (
                          gstData.gstBreakdown.map((b: { rate: number; taxable: number; gst: number }) => (
                            <tr key={b.rate}>
                              <td style={{ fontWeight: 600 }}>{b.rate}%</td>
                              <td>{formatCurrency(b.taxable)}</td>
                              <td style={{ fontWeight: 600, color: "var(--brand-600)" }}>{formatCurrency(b.gst)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="empty-state" style={{ textAlign: "center", padding: "2rem" }}>
                              No taxable sales
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GSTR-1 Invoice Ledger */}
                <div className="card">
                  <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>GSTR-1 Invoice Ledger</span>
                    <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontWeight: 600 }}>{gstData.invoiceCount} Invoices</span>
                  </div>
                  <div className="table-container" style={{ border: "none", borderRadius: 0, overflowX: "auto" }}>
                    <table className="table" style={{ minWidth: "750px" }}>
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Customer</th>
                          <th>GSTIN</th>
                          <th>State</th>
                          <th>Taxable</th>
                          <th>CGST</th>
                          <th>SGST</th>
                          <th>IGST</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gstData.invoices?.length ? (
                          gstData.invoices.map((inv: any) => (
                            <tr key={inv.invoiceNumber}>
                              <td><span style={{ fontWeight: 600 }}>{inv.invoiceNumber}</span></td>
                              <td style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.customer}</td>
                              <td>
                                <span style={{
                                  fontSize: "0.75rem",
                                  padding: "0.125rem 0.375rem",
                                  borderRadius: "4px",
                                  background: inv.gstNumber ? "rgba(16, 185, 129, 0.1)" : "rgba(107, 114, 128, 0.1)",
                                  color: inv.gstNumber ? "#10b981" : "#6b7280",
                                  fontWeight: 500,
                                }}>
                                  {inv.gstNumber || "B2C"}
                                </span>
                              </td>
                              <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{inv.state || "Tamil Nadu"}</td>
                              <td>{formatCurrency(inv.taxableAmount)}</td>
                              <td style={{ color: "var(--text-secondary)" }}>{inv.cgst > 0 ? formatCurrency(inv.cgst) : "-"}</td>
                              <td style={{ color: "var(--text-secondary)" }}>{inv.sgst > 0 ? formatCurrency(inv.sgst) : "-"}</td>
                              <td style={{ color: "var(--text-secondary)" }}>{inv.igst > 0 ? formatCurrency(inv.igst) : "-"}</td>
                              <td style={{ fontWeight: 700 }}>{formatCurrency(inv.totalAmount)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="empty-state" style={{ textAlign: "center", padding: "3rem" }}>
                              No invoices in this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
      )}
    </div>
  );
}
