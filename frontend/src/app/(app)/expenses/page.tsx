"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  TrendingUp,
  Tag,
  X,
  Home,
  Zap,
  Users,
  Truck,
  Coffee,
  Package,
  Wrench,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

// Garment Shop Expense Categories with icons and colors
const EXPENSE_CATEGORIES = [
  { id: "RENT", label: "Shop Rent", icon: Home, color: "#4f46e5", bg: "rgba(79, 70, 229, 0.1)", defaultTitle: "August Month Shop Rent" },
  { id: "ELECTRICITY", label: "Electricity & Bills", icon: Zap, color: "#d97706", bg: "rgba(217, 119, 6, 0.1)", defaultTitle: "EB / Electricity Bill" },
  { id: "SALARY", label: "Staff Salary / Advance", icon: Users, color: "#0891b2", bg: "rgba(8, 145, 178, 0.1)", defaultTitle: "Staff Salary Payout" },
  { id: "TRANSPORT", label: "Transport & Freight", icon: Truck, color: "#ea580c", bg: "rgba(234, 88, 12, 0.1)", defaultTitle: "Tirupur Freight Charges" },
  { id: "TEA_SNACKS", label: "Tea & Refreshments", icon: Coffee, color: "#65a30d", bg: "rgba(101, 163, 13, 0.1)", defaultTitle: "Daily Counter Tea & Snacks" },
  { id: "PACKAGING", label: "Packaging & Bags", icon: Package, color: "#db2777", bg: "rgba(219, 39, 119, 0.1)", defaultTitle: "Garment Carry Bags & Polybags" },
  { id: "MAINTENANCE", label: "Repair & Maintenance", icon: Wrench, color: "#475569", bg: "rgba(71, 85, 105, 0.1)", defaultTitle: "Shop Maintenance / Repairs" },
  { id: "MISC", label: "Miscellaneous", icon: MoreHorizontal, color: "#9333ea", bg: "rgba(147, 51, 234, 0.1)", defaultTitle: "Other Shop Expense" },
];

export default function ExpensesPage() {
  const queryClient = useQueryClient();

  // State filters & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("MISC");
  const [formAmount, setFormAmount] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("CASH");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");

  // 1. Fetch Expenses Summary
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["expenses-summary"],
    queryFn: async () => {
      const res = await api.get("/expenses/summary");
      return res.data;
    },
  });

  // 2. Fetch Expenses List
  const { data: expensesData, isLoading: isListLoading } = useQuery({
    queryKey: ["expenses-list", currentPage, categoryFilter, searchQuery],
    queryFn: async () => {
      const params: any = { page: currentPage, limit: pageSize };
      if (categoryFilter && categoryFilter !== "ALL") params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.get("/expenses", { params });
      return res.data;
    },
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingExpense) {
        return api.put(`/expenses/${editingExpense.id}`, payload);
      } else {
        return api.post("/expenses", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-list"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
      toast.success(editingExpense ? "Expense updated successfully!" : "Expense added successfully!");
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to save expense");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-list"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
      toast.success("Expense deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to delete expense");
    },
  });

  const openAddModal = () => {
    setEditingExpense(null);
    setFormTitle("");
    setFormCategory("MISC");
    setFormAmount("");
    setFormPaymentMethod("CASH");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingExpense(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormAmount(item.amount.toString());
    setFormPaymentMethod(item.paymentMethod);
    setFormDate(new Date(item.date).toISOString().split("T")[0]);
    setFormNotes(item.notes || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleSelectCategory = (catId: string) => {
    setFormCategory(catId);
    if (!formTitle || EXPENSE_CATEGORIES.some((c) => c.defaultTitle === formTitle)) {
      const found = EXPENSE_CATEGORIES.find((c) => c.id === catId);
      if (found) setFormTitle(found.defaultTitle);
    }
  };

  const addPresetAmount = (val: number) => {
    const current = parseFloat(formAmount) || 0;
    setFormAmount((current + val).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Please enter expense title");
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }

    saveMutation.mutate({
      title: formTitle,
      category: formCategory,
      amount: amt,
      paymentMethod: formPaymentMethod,
      date: formDate,
      notes: formNotes,
    });
  };

  const getCategoryMeta = (catId: string) => {
    const found = EXPENSE_CATEGORIES.find((c) => c.id === catId);
    return found || { label: catId, icon: MoreHorizontal, color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" };
  };

  const expensesList = expensesData?.data || [];
  const totalPages = expensesData?.totalPages || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wallet style={{ color: "var(--brand-600)" }} size={26} />
            Shop Expenses
          </h1>
          <p className="page-subtitle">
            Track daily shop spending, rent, staff salary, and transport freight charges
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} type="button">
          <Plus size={16} />
          Record Expense
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">This Month Expenses</span>
            <div className="p-2 rounded-lg" style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--brand-600)" }}>
              <Wallet size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "var(--text-primary)" }}>
            {formatCurrency(summaryData?.totalThisMonth || 0)}
          </div>
          <div className="text-xs text-muted mt-1">
            {summaryData?.totalCount || 0} expenses recorded this month
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Today's Expenses</span>
            <div className="p-2 rounded-lg" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "#10b981" }}>
            {formatCurrency(summaryData?.todayTotal || 0)}
          </div>
          <div className="text-xs text-muted mt-1">Recorded today</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Highest Expense Category</span>
            <div className="p-2 rounded-lg" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
              <Tag size={20} />
            </div>
          </div>
          <div className="stat-value text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {getCategoryMeta(summaryData?.highestCategory || "N/A").label}
          </div>
          <div className="text-xs text-muted mt-1">
            {formatCurrency(summaryData?.highestAmount || 0)}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Expense Categories</span>
            <div className="p-2 rounded-lg" style={{ background: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}>
              <Filter size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "var(--text-primary)" }}>
            {summaryData?.categoryBreakdown?.length || 0} Active
          </div>
          <div className="text-xs text-muted mt-1">Categorized tracking</div>
        </div>
      </div>

      {/* Monthly Category Progress Bar */}
      {summaryData?.categoryBreakdown?.length > 0 && (
        <div className="card" style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-primary)" }}>
            Monthly Spending Breakdown
          </h3>
          <div className="flex rounded-full overflow-hidden" style={{ height: "12px", background: "var(--bg-tertiary)" }}>
            {summaryData.categoryBreakdown.map((c: any) => {
              const meta = getCategoryMeta(c.category);
              return (
                <div
                  key={c.category}
                  style={{
                    width: `${c.percentage}%`,
                    background: meta.color,
                    transition: "width 0.3s ease",
                  }}
                  title={`${meta.label}: ${formatCurrency(c.totalAmount)} (${c.percentage}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs">
            {summaryData.categoryBreakdown.map((c: any) => {
              const meta = getCategoryMeta(c.category);
              return (
                <div key={c.category} className="flex items-center gap-1.5">
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: meta.color }} />
                  <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                    {meta.label}: <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(c.totalAmount)}</span> ({c.percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Category Filter Toolbar */}
      <div className="card" style={{ padding: "1rem" }}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1" style={{ maxWidth: "360px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-tertiary)",
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search expenses by title or notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingLeft: "2.25rem", fontSize: "0.875rem" }}
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
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1" style={{ background: "var(--bg-tertiary)", padding: "3px", borderRadius: "0.5rem" }}>
            <button
              type="button"
              className={`btn btn-sm ${categoryFilter === "ALL" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setCategoryFilter("ALL");
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.75rem" }}
            >
              All
            </button>
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`btn btn-sm ${categoryFilter === cat.id ? "btn-primary" : "btn-ghost"}`}
                onClick={() => {
                  setCategoryFilter(cat.id);
                  setCurrentPage(1);
                }}
                style={{ fontSize: "0.75rem" }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {isListLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading expenses...
          </div>
        ) : expensesList.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <Wallet size={40} style={{ color: "var(--text-tertiary)", margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>No expenses recorded</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Click "Record Expense" to log your shop rent, electricity, freight, or staff salary.
            </p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title & Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Paid Via</th>
                  <th>Recorded By</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expensesList.map((exp: any) => {
                  const meta = getCategoryMeta(exp.category);
                  const IconComp = meta.icon;
                  return (
                    <tr key={exp.id}>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {formatDate(exp.date)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{exp.title}</div>
                        {exp.notes && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{exp.notes}</div>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: meta.bg,
                            color: meta.color,
                            borderColor: `${meta.color}30`,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          <IconComp size={13} />
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                        {formatCurrency(exp.amount)}
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: "0.75rem" }}>
                          {exp.paymentMethod}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {exp.createdBy?.name || "Staff"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.375rem" }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => openEditModal(exp)}
                            title="Edit Expense"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color: "var(--error-600)" }}
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${exp.title}"?`)) {
                                deleteMutation.mutate(exp.id);
                              }
                            }}
                            title="Delete Expense"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between"
                style={{ padding: "1rem", borderTop: "1px solid var(--border-color)" }}
              >
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Direct Clean Modal Overlay */}
      {isModalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "var(--bg-secondary)",
              borderRadius: "0.75rem",
              border: "1px solid var(--border-color)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-primary)" }}>
                <Wallet size={20} style={{ color: "var(--brand-600)" }} />
                {editingExpense ? "Edit Expense" : "Record New Expense"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="btn btn-ghost btn-sm btn-icon"
                style={{ borderRadius: "50%", padding: "0.25rem" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem" }}>
                {/* Visual Category Selector Cards */}
                <div>
                  <label className="form-label" style={{ marginBottom: "0.5rem", display: "block" }}>
                    Select Expense Category *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const IconComp = cat.icon;
                      const isSelected = formCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat.id)}
                          style={{
                            padding: "0.5rem 0.25rem",
                            borderRadius: "0.5rem",
                            border: `1.5px solid ${isSelected ? cat.color : "var(--border-color)"}`,
                            background: isSelected ? cat.bg : "var(--bg-tertiary)",
                            color: isSelected ? cat.color : "var(--text-secondary)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.25rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            textAlign: "center",
                          }}
                        >
                          <IconComp size={16} />
                          <span style={{ fontSize: "0.6875rem", fontWeight: isSelected ? 700 : 500, lineHeight: 1.1 }}>
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expense Title */}
                <div>
                  <label className="form-label">Expense Title / Particulars *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. August Shop Rent, Tirupur Freight Parcel"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Amount & Quick Preset Buttons */}
                <div>
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--brand-600)" }}
                    required
                  />
                  {/* Quick Amount Add Buttons */}
                  <div className="flex gap-1.5 mt-2">
                    {[100, 500, 1000, 5000, 10000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className="btn btn-xs btn-secondary"
                        onClick={() => addPresetAmount(val)}
                        style={{ fontSize: "0.7rem", fontWeight: 600 }}
                      >
                        +₹{val >= 1000 ? `${val / 1000}k` : val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paid Via & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Paid Via *</label>
                    <select
                      className="form-select"
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI (GPay / PhonePe)</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Expense Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="form-label">Notes / Receipt Ref (Optional)</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Add payment reference number or notes..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  padding: "1rem 1.25rem",
                  borderTop: "1px solid var(--border-color)",
                  background: "var(--bg-tertiary)",
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingExpense ? "Update Expense" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
