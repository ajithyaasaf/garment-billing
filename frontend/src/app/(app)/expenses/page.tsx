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
  Calendar,
  DollarSign,
  TrendingUp,
  Tag,
  X,
  CheckCircle2,
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

// Garment Shop Expense Categories
const EXPENSE_CATEGORIES = [
  { id: "RENT", label: "Shop Rent", icon: Home, color: "#4f46e5" },
  { id: "ELECTRICITY", label: "Electricity & Utilities", icon: Zap, color: "#eab308" },
  { id: "SALARY", label: "Staff Salary / Advance", icon: Users, color: "#06b6d4" },
  { id: "TRANSPORT", label: "Transport & Freight", icon: Truck, color: "#f97316" },
  { id: "TEA_SNACKS", label: "Tea, Snacks & Refreshments", icon: Coffee, color: "#84cc16" },
  { id: "PACKAGING", label: "Packaging & Bags", icon: Package, color: "#ec4899" },
  { id: "MAINTENANCE", label: "Repair & Maintenance", icon: Wrench, color: "#64748b" },
  { id: "MISC", label: "Miscellaneous", icon: MoreHorizontal, color: "#a855f7" },
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

  // Create / Update Mutation
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
    return found || { label: catId, icon: MoreHorizontal, color: "#64748b" };
  };

  const expensesList = expensesData?.data || [];
  const totalPages = expensesData?.totalPages || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header */}
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
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} />
          Record Expense
        </button>
      </div>

      {/* KPI Cards */}
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

      {/* Category Progress Bar */}
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

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ padding: "1rem" }}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
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
              placeholder="Search expenses by title or note..."
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
              Click "Record Expense" above to add your shop rent, staff salary, or transport bills.
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
                  <th>Payment Method</th>
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
                            background: `${meta.color}15`,
                            color: meta.color,
                            borderColor: `${meta.color}30`,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          <IconComp size={12} />
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
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => openEditModal(exp)}
                            title="Edit Expense"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
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
                    className="btn btn-sm btn-secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
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

      {/* Record / Edit Expense Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {editingExpense ? "Edit Expense" : "Record New Expense"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="btn btn-ghost btn-sm btn-icon"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="form-label">Expense Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. August Month Shop Rent, Freight for Stock"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

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
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Notes / Description (Optional)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Add payment reference, receipt number, or details..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saveMutation.isPending}
                >
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
