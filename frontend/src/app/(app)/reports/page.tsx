"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, DollarSign, Users, Package, Download, BarChart3, Loader2, ShoppingBag, Truck, UserPlus, Calendar } from "lucide-react";
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

const getStateCode = (state: string): string => {
  const s = (state || "").trim().toLowerCase();
  if (s.includes("tamil")) return "33-Tamil Nadu";
  if (s.includes("karnataka")) return "29-Karnataka";
  if (s.includes("kerala")) return "32-Kerala";
  if (s.includes("andhra")) return "37-Andhra Pradesh";
  if (s.includes("telangana")) return "36-Telangana";
  if (s.includes("maharashtra")) return "27-Maharashtra";
  if (s.includes("delhi")) return "07-Delhi";
  if (s.includes("gujarat")) return "24-Gujarat";
  return "33-Tamil Nadu";
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "customers" | "purchases" | "gst" | "outstanding" | "profit">("overview");
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [purchaseYear, setPurchaseYear] = useState<number>(currentYear);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<"ALL" | "WHOLESALE" | "RETAIL">("ALL");

  const { data: gstData, isLoading: isLoadingGst, isFetching: isFetchingGst, refetch: refetchGst } = useQuery({
    queryKey: ["report-gst", selectedMonth, selectedYear],
    queryFn: async () => (await api.get(`/reports/gst?month=${selectedMonth}&year=${selectedYear}`)).data,
    enabled: activeTab === "gst",
  });

  const { data: dailySales, isLoading: isLoadingDaily } = useQuery({
    queryKey: ["report-daily", selectedYear],
    queryFn: async () => (await api.get("/reports/sales-daily?days=30")).data,
    enabled: activeTab === "overview",
  });

  const { data: monthlySales, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ["report-monthly", selectedYear],
    queryFn: async () => (await api.get(`/reports/sales-monthly?year=${selectedYear}`)).data,
    enabled: activeTab === "overview",
  });

  const { data: productSales, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["report-products", selectedYear],
    queryFn: async () => (await api.get("/reports/product-sales?limit=10")).data,
    enabled: activeTab === "products",
  });

  const { data: customerSales, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["report-customers", customerTypeFilter, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerTypeFilter !== "ALL") params.set("customerType", customerTypeFilter);
      return (await api.get(`/reports/customer-sales?${params}`)).data;
    },
    enabled: activeTab === "customers",
  });

  const { data: purchasesSummary, isLoading: isLoadingPurchasesSummary } = useQuery({
    queryKey: ["report-purchases-summary", purchaseYear],
    queryFn: async () => (await api.get(`/reports/purchases-summary?year=${purchaseYear}`)).data,
    enabled: activeTab === "purchases",
  });

  const { data: realtimeSummary, isLoading: isLoadingRealtimeSummary } = useQuery({
    queryKey: ["report-realtime-summary"],
    queryFn: async () => (await api.get("/reports/realtime-summary")).data,
    enabled: activeTab === "overview",
  });

  const { data: outstanding, isLoading: isLoadingOutstanding } = useQuery({
    queryKey: ["report-outstanding", customerTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerTypeFilter !== "ALL") params.set("customerType", customerTypeFilter);
      return (await api.get(`/reports/outstanding?${params}`)).data;
    },
    enabled: activeTab === "outstanding",
  });

  const { data: supplierOutstanding, isLoading: isLoadingSupplierOutstanding } = useQuery({
    queryKey: ["report-supplier-outstanding"],
    queryFn: async () => (await api.get("/reports/supplier-outstanding")).data,
    enabled: activeTab === "outstanding",
  });

  const { data: profit, isLoading: isLoadingProfit } = useQuery({
    queryKey: ["report-profit", selectedYear],
    queryFn: async () => (await api.get(`/reports/profit?fromDate=${selectedYear}-01-01&toDate=${selectedYear}-12-31`)).data,
    enabled: activeTab === "overview" || activeTab === "profit",
  });


  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `report_${activeTab}.xlsx`;
    let colWidths: { wch: number }[] = [];

    if (activeTab === "gst" && gstData) {
      filename = `GSTR1_Report_${selectedMonth}_${selectedYear}.xlsx`;
      headers = [
        "GSTIN/UIN of Recipient",
        "Receiver Name",
        "Invoice Number",
        "Invoice Date",
        "Invoice Value",
        "Place Of Supply",
        "Reverse Charge",
        "Applicable % of Tax Rate",
        "Invoice Type",
        "E-Commerce GSTIN",
        "Taxable Value",
        "Cess Amount"
      ];
      colWidths = [
        { wch: 22 }, // GSTIN/UIN of Recipient
        { wch: 25 }, // Receiver Name
        { wch: 18 }, // Invoice Number
        { wch: 15 }, // Invoice Date
        { wch: 15 }, // Invoice Value
        { wch: 22 }, // Place Of Supply
        { wch: 15 }, // Reverse Charge
        { wch: 25 }, // Applicable % of Tax Rate
        { wch: 15 }, // Invoice Type
        { wch: 18 }, // E-Commerce GSTIN
        { wch: 18 }, // Taxable Value
        { wch: 15 }  // Cess Amount
      ];

      rows = [];
      (gstData.invoices || []).forEach((inv: any) => {
        const d = new Date(inv.invoiceDate);
        const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        const pos = getStateCode(inv.state);

        const itemGroups: Record<number, { taxable: number; gst: number }> = {};
        (inv.items || []).forEach((item: any) => {
          const rate = item.gstPercent;
          if (!itemGroups[rate]) {
            itemGroups[rate] = { taxable: 0, gst: 0 };
          }
          itemGroups[rate].taxable += item.totalAmount - item.gstAmount;
          itemGroups[rate].gst += item.gstAmount;
        });

        Object.entries(itemGroups).forEach(([rateStr, group]) => {
          const rate = Number(rateStr);
          rows.push([
            inv.gstNumber || "",
            inv.customer,
            inv.invoiceNumber,
            formattedDate,
            Number(inv.totalAmount.toFixed(2)),
            pos,
            "N",
            rate,
            inv.gstNumber ? "Regular" : "B2C",
            "",
            Number(group.taxable.toFixed(2)),
            0.00
          ]);
        });
      });
    } else if (activeTab === "products" && productSales) {
      filename = `Product_Sales_Report.xlsx`;
      headers = ["Product Name", "Quantity Sold", "Total Sales Value (INR)"];
      colWidths = [{ wch: 30 }, { wch: 15 }, { wch: 22 }];
      rows = productSales.map((item: any) => [
        item.productName,
        Number(item._sum.quantity),
        Number(item._sum.totalAmount.toFixed(2))
      ]);
    } else if (activeTab === "customers" && customerSales) {
      filename = `Customer_Sales_Report.xlsx`;
      headers = ["Customer Shop Name", "City", "Total Sales Value (INR)", "Total Paid (INR)", "Total Due (INR)", "Invoice Count"];
      colWidths = [{ wch: 25 }, { wch: 15 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
      rows = customerSales.map((item: any) => [
        item.shopName || "Unknown",
        item.city || "Unknown",
        Number(item._sum.totalAmount.toFixed(2)),
        Number(item._sum.paidAmount.toFixed(2)),
        Number(item._sum.dueAmount.toFixed(2)),
        Number(item._count)
      ]);
    } else if (activeTab === "outstanding" && outstanding) {
      filename = `Outstanding_Invoices_Report.xlsx`;
      headers = ["Invoice Number", "Customer Name", "City", "Total Amount (INR)", "Due Amount (INR)", "Payment Status"];
      colWidths = [{ wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
      rows = (outstanding.invoices || []).map((inv: any) => [
        inv.invoiceNumber,
        inv.customer.shopName || inv.customer.ownerName,
        inv.customer.city,
        Number(inv.totalAmount.toFixed(2)),
        Number(inv.dueAmount.toFixed(2)),
        inv.paymentStatus
      ]);
    } else if (activeTab === "outstanding" && outstanding) {
      const workbook = XLSX.utils.book_new();
      filename = `Outstanding_Dues_Report.xlsx`;
      
      const custHeaders = ["Invoice Number", "Customer Name", "City", "Total Amount (INR)", "Due Amount (INR)", "Payment Status"];
      const custRows = (outstanding.invoices || []).map((inv: any) => [
        inv.invoiceNumber,
        inv.customer.shopName || inv.customer.ownerName,
        inv.customer.city,
        Number(inv.totalAmount.toFixed(2)),
        Number(inv.dueAmount.toFixed(2)),
        inv.paymentStatus
      ]);
      const custSheet = XLSX.utils.aoa_to_sheet([custHeaders, ...custRows]);
      custSheet["!cols"] = [{ wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, custSheet, "Customer Receivables");

      if (supplierOutstanding) {
        const suppHeaders = ["Purchase Bill #", "Supplier Shop", "City", "Total Amount (INR)", "Due Amount (INR)", "Payment Status"];
        const suppRows = (supplierOutstanding.bills || []).map((bill: any) => [
          bill.billNumber,
          bill.supplier.shopName || bill.supplier.ownerName,
          bill.supplier.city,
          Number(bill.totalAmount.toFixed(2)),
          Number(bill.dueAmount.toFixed(2)),
          bill.paymentStatus
        ]);
        const suppSheet = XLSX.utils.aoa_to_sheet([suppHeaders, ...suppRows]);
        suppSheet["!cols"] = [{ wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, suppSheet, "Supplier Payables");
      }
      
      XLSX.writeFile(workbook, filename);
      return;
    } else if (activeTab === "purchases" && purchasesSummary) {
      const workbook = XLSX.utils.book_new();
      filename = `Purchases_Sourcing_Report.xlsx`;
      
      const suppHeaders = ["Supplier Name", "Total Sourced (INR)"];
      const suppRows = (purchasesSummary.topSuppliers || []).map((s: any) => [
        s.shopName,
        Number(s.total.toFixed(2))
      ]);
      const suppSheet = XLSX.utils.aoa_to_sheet([suppHeaders, ...suppRows]);
      suppSheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, suppSheet, "Top Suppliers");

      const monthlyHeaders = ["Month", "Total Purchases (INR)", "Paid (INR)", "Bill Count"];
      const monthlyRows = (purchasesSummary.monthly || []).map((m: any) => [
        monthNames[m.month - 1],
        Number(m.total.toFixed(2)),
        Number(m.paid.toFixed(2)),
        m.count
      ]);
      const monthlySheet = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyRows]);
      monthlySheet["!cols"] = [{ wch: 15 }, { wch: 22 }, { wch: 20 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, monthlySheet, "Monthly Sourcing");
      
      XLSX.writeFile(workbook, filename);
      return;
    } else if (activeTab === "profit" && profit) {
      filename = `Profit_Loss_Report.xlsx`;
      headers = ["Metric", "Amount (INR)"];
      colWidths = [{ wch: 25 }, { wch: 20 }];
      rows = [
        ["Total Revenue", Number(profit.revenue.toFixed(2))],
        ["Cost of Goods Sold", Number(profit.costOfGoods.toFixed(2))],
        ["Gross Profit", Number(profit.grossProfit.toFixed(2))],
        ["Profit Margin (%)", `${profit.profitMargin}%`]
      ];
    } else if (activeTab === "overview" && dailySales) {
      filename = `Daily_Sales_Trend.xlsx`;
      headers = ["Date", "Revenue (INR)", "Collected (INR)", "Invoice Count"];
      colWidths = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
      rows = dailySales.map((item: any) => [
        item.date,
        Number(item.revenue.toFixed(2)),
        Number(item.collected.toFixed(2)),
        Number(item.count)
      ]);
    } else {
      return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === "gst" ? "GST Report" : "Report Data");
    XLSX.writeFile(workbook, filename);
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "products", label: "Products" },
    { key: "customers", label: "Customers" },
    { key: "purchases", label: "Purchases & Suppliers" },
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
            (activeTab === "purchases" && !purchasesSummary) ||
            (activeTab === "outstanding" && !outstanding && !supplierOutstanding) ||
            (activeTab === "profit" && !profit) ||
            (activeTab === "gst" && !gstData)
          }
        >
          <Download size={15} />
          Export Report
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.625rem", padding: "0.25rem", marginBottom: "1rem", overflowX: "auto" }}>
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

      {/* Contextual Filter Bar */}
      {(activeTab !== "overview") && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem", padding: "0.875rem 1rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.625rem" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Filter by:</span>

          {/* Year filter — shown on most tabs */}
          {(activeTab === "products" || activeTab === "customers" || activeTab === "profit" || activeTab === "gst") && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ fontSize: "0.8125rem", padding: "0.3rem 0.6rem", borderRadius: "0.375rem", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", cursor: "pointer" }}
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Purchase year — only on purchases tab */}
          {activeTab === "purchases" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Year</label>
              <select
                value={purchaseYear}
                onChange={(e) => setPurchaseYear(Number(e.target.value))}
                style={{ fontSize: "0.8125rem", padding: "0.3rem 0.6rem", borderRadius: "0.375rem", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", cursor: "pointer" }}
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Month filter — only on GST tab */}
          {activeTab === "gst" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{ fontSize: "0.8125rem", padding: "0.3rem 0.6rem", borderRadius: "0.375rem", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", cursor: "pointer" }}
              >
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Customer Type filter — customers and outstanding tabs */}
          {(activeTab === "customers" || activeTab === "outstanding") && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Customer Type</label>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {(["ALL", "WHOLESALE", "RETAIL"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCustomerTypeFilter(type)}
                    style={{
                      padding: "0.3rem 0.7rem",
                      borderRadius: "0.375rem",
                      border: "1px solid",
                      borderColor: customerTypeFilter === type ? "var(--brand-600)" : "var(--border-color)",
                      background: customerTypeFilter === type ? "var(--brand-600)" : "transparent",
                      color: customerTypeFilter === type ? "white" : "var(--text-secondary)",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {type === "ALL" ? "All" : type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Real-time summaries */}
          {isLoadingRealtimeSummary ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="stat-card">
                  <div className="skeleton" style={{ width: "90px", height: "0.75rem" }} />
                  <div className="skeleton" style={{ width: "130px", height: "1.5rem", marginTop: "0.5rem" }} />
                </div>
              ))}
            </div>
          ) : realtimeSummary ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem" }}>
              {[
                { 
                  label: "Today's Sales", 
                  value: formatCurrency(realtimeSummary.today.salesRevenue), 
                  subtitle: `${realtimeSummary.today.salesCount} bookings today`, 
                  detail: `Wholesale: ${formatCurrency(realtimeSummary.today.wholesaleRevenue)} | Retail: ${formatCurrency(realtimeSummary.today.retailRevenue)}`,
                  icon: DollarSign, 
                  color: "#10b981" 
                },
                { 
                  label: "Today's Sourcing", 
                  value: formatCurrency(realtimeSummary.today.purchaseTotal), 
                  subtitle: `${realtimeSummary.today.purchaseCount} purchase bills today`, 
                  detail: null,
                  icon: Truck, 
                  color: "#f59e0b" 
                },
                { 
                  label: "Weekly Sales", 
                  value: formatCurrency(realtimeSummary.week.salesRevenue), 
                  subtitle: `${realtimeSummary.week.salesCount} bookings this week`, 
                  detail: `Wholesale: ${formatCurrency(realtimeSummary.week.wholesaleRevenue)} | Retail: ${formatCurrency(realtimeSummary.week.retailRevenue)}`,
                  icon: TrendingUp, 
                  color: "#3b82f6" 
                },
                { 
                  label: "Weekly Sourcing", 
                  value: formatCurrency(realtimeSummary.week.purchaseTotal), 
                  subtitle: `${realtimeSummary.week.purchaseCount} bills this week`, 
                  detail: null,
                  icon: Package, 
                  color: "#f97316" 
                },
                { 
                  label: "New Customers", 
                  value: `${realtimeSummary.week.newCustomers} New`, 
                  subtitle: "Acquired in last 7 days", 
                  detail: null,
                  icon: UserPlus, 
                  color: "#8b5cf6" 
                },
              ].map((card) => (
                <div key={card.label} className="stat-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p className="stat-label">{card.label}</p>
                      <p className="stat-value" style={{ marginTop: "0.5rem" }}>{card.value}</p>
                      <p style={{ fontSize: "0.725rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>{card.subtitle}</p>
                      {card.detail && (
                        <p style={{ fontSize: "0.6875rem", color: "var(--brand-600)", fontWeight: 500, marginTop: "0.25rem" }}>
                          {card.detail}
                        </p>
                      )}
                    </div>
                    <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color }}>
                      <card.icon size={18} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* 2-Column Row for Fast Moving Products and Monthly Sales Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Fast Selling Products (Real-time moving items) */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Fast-Moving Products (Dresses)</span>
                <span className="badge badge-success" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>Live velocity</span>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {isLoadingRealtimeSummary ? (
                    Array(5).fill(null).map((_, i) => (
                      <div key={i} className="skeleton" style={{ width: "100%", height: "2.5rem" }} />
                    ))
                  ) : realtimeSummary?.fastMoving?.length ? (
                    realtimeSummary.fastMoving.map((p: any, i: number) => (
                      <div key={p.productId} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ width: "1.75rem", height: "1.75rem", borderRadius: "0.375rem", background: `${COLORS[i % COLORS.length]}15`, color: COLORS[i % COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem" }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.productName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{formatNumber(p.quantity)} units sold recently</div>
                        </div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(p.revenue)}</div>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem" }}>No sales recorded yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Revenue Trend Chart */}
            {isLoadingMonthly ? (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
                <div className="skeleton" style={{ width: "200px", height: "1rem" }} />
                <div className="skeleton" style={{ width: "100%", height: "280px" }} />
              </div>
            ) : monthlySales ? (
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Monthly Revenue Trend – {new Date().getFullYear()}</span>
                  <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "10px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontWeight: 600 }}>12 months</span>
                </div>
                <div className="card-body" style={{ padding: "1rem 0.5rem 0.5rem 0.5rem" }}>
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={monthlySales.map((m: { month: number; revenue: number; collected: number }) => ({ ...m, name: monthNames[m.month - 1] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip content={<CustomMonthlyTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f615" strokeWidth={2} name="Revenue" />
                      <Area type="monotone" dataKey="collected" stroke="#10b981" fill="#10b98115" strokeWidth={2} name="Collected" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </div>

          {/* Daily Sales Chart */}
          {isLoadingDaily ? (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
              <div className="skeleton" style={{ width: "180px", height: "1rem" }} />
              <div className="skeleton" style={{ width: "100%", height: "220px" }} />
            </div>
          ) : dailySales ? (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Daily Sales Trend – Last 30 Days</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

      {/* Purchases & Suppliers Tab */}
      {activeTab === "purchases" && (
        isLoadingPurchasesSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        ) : purchasesSummary ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Top Suppliers */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Top Sourcing Suppliers</span>
                <span className="badge badge-primary" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                  {purchasesSummary.topSuppliers?.length || 0} Suppliers
                </span>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {purchasesSummary.topSuppliers?.map((s: { shopName: string; total: number }, i: number) => (
                    <div key={s.shopName} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ width: "1.75rem", height: "1.75rem", borderRadius: "0.375rem", background: `${COLORS[i % COLORS.length]}15`, color: COLORS[i % COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem" }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{s.shopName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Sourcing Partner</div>
                      </div>
                      <div style={{ fontWeight: 700 }}>{formatCurrency(s.total || 0)}</div>
                    </div>
                  ))}
                  {(!purchasesSummary.topSuppliers || purchasesSummary.topSuppliers.length === 0) && (
                    <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                      <Truck size={36} style={{ color: "var(--text-tertiary)", marginBottom: "0.75rem", display: "block", margin: "0 auto 0.75rem" }} />
                      <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>No purchases recorded for {purchaseYear}</p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>Add purchase bills from your suppliers to see sourcing analytics here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Purchases Chart */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Monthly Sourcing Trend</span>
                <span className="badge badge-success" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>{purchaseYear}</span>
              </div>
              <div className="card-body" style={{ padding: "1rem 0.5rem 0.5rem 0.5rem" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={purchasesSummary.monthly?.map((m: any) => ({ ...m, name: monthNames[m.month - 1] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomMonthlyTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#f59e0b" fill="#f59e0b15" strokeWidth={2} name="Total Sourced" />
                    <Area type="monotone" dataKey="paid" stroke="#10b981" fill="#10b98115" strokeWidth={2} name="Total Paid" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
            <Truck size={48} style={{ color: "var(--text-tertiary)", margin: "0 auto 1rem", display: "block" }} />
            <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Purchases data unavailable</p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)" }}>Make sure the backend is running and you have recorded purchase bills.</p>
          </div>
        )
      )}

      {/* Outstanding Tab */}
      {activeTab === "outstanding" && (
        isLoadingOutstanding || isLoadingSupplierOutstanding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Customer Receivables", value: formatCurrency(outstanding.total), count: `${outstanding.count} invoices`, color: "#ef4444" },
                { label: "Supplier Payables", value: formatCurrency(supplierOutstanding?.total || 0), count: `${supplierOutstanding?.count || 0} bills`, color: "#f59e0b" },
                { label: "Net Position (Receivables - Payables)", value: formatCurrency(outstanding.total - (supplierOutstanding?.total || 0)), count: "Outstanding balance", color: (outstanding.total - (supplierOutstanding?.total || 0)) >= 0 ? "#10b981" : "#ef4444" },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <p className="stat-label">{s.label}</p>
                  <p className="stat-value" style={{ color: s.color, marginTop: "0.5rem" }}>{s.value}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{s.count}</p>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Customer Receivables Card */}
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Customer Receivables (Outstanding Invoices)</span>
                  <span className="badge badge-danger" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                    {outstanding.count} pending
                  </span>
                </div>
                <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                  <table className="table">
                    <thead>
                      <tr><th>Invoice #</th><th>Customer</th><th>City</th><th>Due</th></tr>
                    </thead>
                    <tbody>
                      {outstanding.invoices?.map((inv: any) => (
                        <tr key={inv.id}>
                          <td><a href={`/invoices/${inv.id}`} style={{ color: "var(--brand-600)", textDecoration: "none", fontWeight: 600 }}>{inv.invoiceNumber}</a></td>
                          <td style={{ fontWeight: 500 }}>{inv.customer.shopName || inv.customer.ownerName}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{inv.customer.city}</td>
                          <td style={{ fontWeight: 700, color: "var(--danger)" }}>{formatCurrency(inv.dueAmount)}</td>
                        </tr>
                      ))}
                      {(!outstanding.invoices || outstanding.invoices.length === 0) && (
                        <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-secondary)" }}>No outstanding customer dues</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Supplier Payables Card */}
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Supplier Payables (Outstanding Purchase Bills)</span>
                  <span className="badge badge-warning" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
                    {supplierOutstanding?.count || 0} unpaid
                  </span>
                </div>
                <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                  <table className="table">
                    <thead>
                      <tr><th>Bill #</th><th>Supplier</th><th>City</th><th>Due</th></tr>
                    </thead>
                    <tbody>
                      {supplierOutstanding?.bills?.map((bill: any) => (
                        <tr key={bill.id}>
                          <td><a href={`/purchases/${bill.id}`} style={{ color: "var(--brand-600)", textDecoration: "none", fontWeight: 600 }}>{bill.billNumber}</a></td>
                          <td style={{ fontWeight: 500 }}>{bill.supplier.shopName || bill.supplier.ownerName}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{bill.supplier.city}</td>
                          <td style={{ fontWeight: 700, color: "#f59e0b" }}>{formatCurrency(bill.dueAmount)}</td>
                        </tr>
                      ))}
                      {(!supplierOutstanding?.bills || supplierOutstanding.bills.length === 0) && (
                        <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-secondary)" }}>No outstanding supplier dues</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null
      )}

      {/* Profit Tab */}
      {activeTab === "profit" && (
        isLoadingProfit ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                {/* GST Slab Breakdown */}
                <div className="card lg:col-span-1">
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
                <div className="card lg:col-span-2">
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
