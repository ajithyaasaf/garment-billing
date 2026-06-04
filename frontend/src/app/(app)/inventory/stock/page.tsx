"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Plus, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight, ClipboardList, Ban } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate, debounce, formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface SearchProduct {
  id: string;
  name: string;
  sku: string;
  wholesalePrice: number;
  variants: { id: string; color: string; size: string; stock: number }[];
}

export default function StockOperationsPage() {
  const qc = useQueryClient();

  // Stock operation form states
  const [opType, setOpType] = useState<"inward" | "return" | "damaged">("inward");
  const [productSearch, setProductSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedSearch(val as string), 300), []
  );

  const { data: searchResults } = useQuery({
    queryKey: ["product-search-stock", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const res = await api.get(`/products?search=${debouncedSearch}&limit=5`);
      return res.data?.data || [];
    },
    enabled: debouncedSearch.length > 1,
  });

  const { data: lowStockData, isLoading: isLoadingLowStock } = useQuery({
    queryKey: ["low-stock"],
    queryFn: async () => (await api.get("/stock/low-stock")).data,
  });

  const { data: movementsData, isLoading: isLoadingMovements, refetch: refetchMovements } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => (await api.get("/stock/movements?limit=25")).data,
  });

  const operationMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        productId: selectedProduct?.id,
        variantId: selectedVariantId,
        quantity: Number(quantity),
        reason,
        ...(opType === "inward" && { reference }),
      };
      return (await api.post(`/stock/${opType}`, payload)).data;
    },
    onSuccess: () => {
      toast.success(`Stock ${opType} recorded successfully!`);
      // Reset form
      setSelectedProduct(null);
      setSelectedVariantId("");
      setQuantity(1);
      setReason("");
      setReference("");
      setProductSearch("");

      // Invalidate queries
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      refetchMovements();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to record stock operation");
    },
  });

  const selectProduct = (prod: SearchProduct) => {
    setSelectedProduct(prod);
    if (prod.variants?.length > 0) {
      setSelectedVariantId(prod.variants[0].id);
    } else {
      setSelectedVariantId("");
    }
    setProductSearch("");
    setDebouncedSearch("");
  };

  const handleApplyStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) {
      toast.error("Please select a product variant first");
      return;
    }
    if (quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    operationMutation.mutate();
  };

  return (
    <div style={{ maxWidth: "1100px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/inventory" className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Stock Operations</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Perform inwarding, returns, and track inventory movements</p>
        </div>
      </div>

      <div className="stock-operations-layout" style={{ display: "grid", gap: "1.25rem", alignItems: "start" }}>

        {/* Left Column - Action Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>

          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600 }}>New Stock Action</span>
            </div>
            <div className="card-body">
              {/* Operation type toggles */}
              <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-tertiary)", padding: "0.25rem", borderRadius: "0.5rem", marginBottom: "1.25rem" }}>
                {[
                  { key: "inward", label: "Inward Stock", color: "var(--success)" },
                  { key: "return", label: "Return Stock", color: "var(--brand-600)" },
                  { key: "damaged", label: "Mark Damaged", color: "var(--danger)" },
                ].map((type) => (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => setOpType(type.key as any)}
                    style={{
                      flex: 1,
                      padding: "0.4rem 0",
                      borderRadius: "0.375rem",
                      border: "none",
                      background: opType === type.key ? "var(--bg-secondary)" : "transparent",
                      color: opType === type.key ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: opType === type.key ? 700 : 500,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleApplyStock} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Product search input */}
                {!selectedProduct ? (
                  <div className="form-group" style={{ position: "relative" }}>
                    <label className="form-label">Search Product *</label>
                    <div style={{ position: "relative" }}>
                      <Search size={15} color="var(--text-tertiary)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        className="form-input"
                        style={{ paddingLeft: "2.25rem" }}
                        placeholder="Search product SKU or name..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          debouncedSetSearch(e.target.value);
                        }}
                      />
                    </div>

                    {/* Results dropdown */}
                    {searchResults && searchResults.length > 0 && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.5rem", zIndex: 10, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
                        {searchResults.map((prod: SearchProduct) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => selectProduct(prod)}
                            style={{ width: "100%", padding: "0.625rem 0.875rem", border: "none", background: "none", borderBottom: "1px solid var(--border-color)", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                          >
                            <div>
                              <p style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{prod.name}</p>
                              <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>SKU: {prod.sku}</p>
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "var(--brand-600)", fontWeight: 600 }}>{prod.variants?.length || 0} vars</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: "var(--bg-tertiary)", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Selected Product</p>
                      <p style={{ fontWeight: 700, fontSize: "0.875rem", marginTop: "0.125rem" }}>{selectedProduct.name}</p>
                      <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>SKU: {selectedProduct.sku}</p>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", fontSize: "0.75rem" }} onClick={() => setSelectedProduct(null)}>Change</button>
                  </div>
                )}

                {/* Variant selection */}
                {selectedProduct && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Select Variant *</label>
                      <select
                        className="form-input form-select"
                        value={selectedVariantId}
                        onChange={(e) => setSelectedVariantId(e.target.value)}
                      >
                        {selectedProduct.variants?.map((v) => (
                          <option key={v.id} value={v.id}>
                            Color: {v.color} | Size: {v.size} (Current stock: {v.stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div className="form-group">
                        <label className="form-label">Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                      </div>

                      {opType === "inward" && (
                        <div className="form-group">
                          <label className="form-label">Invoice Ref (optional)</label>
                          <input
                            className="form-input"
                            placeholder="e.g. BILL-909"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Reason / Notes</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Stock adjustment, return order..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: "100%", marginTop: "0.5rem" }}
                      disabled={operationMutation.isPending}
                    >
                      {operationMutation.isPending ? "Applying..." : `Apply Stock ${opType.toUpperCase()}`}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>

          {/* Low stock indicators */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <AlertTriangle size={15} color="var(--warning)" />
              <span style={{ fontWeight: 600 }}>Low Stock Alerts</span>
            </div>
            <div className="card-body" style={{ maxHeight: "300px", overflowY: "auto", padding: 0 }}>
              {isLoadingLowStock ? (
                <div style={{ padding: "1rem" }}><div className="skeleton" style={{ height: "3rem" }} /></div>
              ) : lowStockData && lowStockData.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {lowStockData.map((variant: any, idx: number) => (
                    <div key={variant.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)" }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{variant.product?.name}</p>
                        <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                          Color: {variant.color} · Size: {variant.size} · SKU: {variant.product?.sku}
                        </p>
                      </div>
                      <span className="badge badge-danger" style={{ fontWeight: 700 }}>
                        {variant.stock} Left
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem" }}>All variants are healthy! No low stock alerts.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Timeline Movements */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "650px" }}>
          <div className="card-header" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ClipboardList size={16} color="var(--brand-600)" />
            <span style={{ fontWeight: 600 }}>Recent Stock Ledger</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
            {isLoadingMovements ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: "3.5rem" }} />)}
              </div>
            ) : movementsData?.data?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {movementsData.data.map((m: any, idx: number) => {
                  const isInward = m.type === "INWARD" || m.type === "RETURN" || m.quantity > 0;
                  return (
                    <div key={m.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "var(--bg-tertiary)", borderRadius: "0.5rem", border: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div style={{ width: "2rem", height: "2rem", borderRadius: "0.375rem", background: isInward ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isInward ? <ArrowUpRight size={14} color="var(--success)" /> : <ArrowDownRight size={14} color="var(--danger)" />}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "0.8125rem" }}>{m.product?.name}</p>
                          <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                            {m.variant?.color} / {m.variant?.size} · {m.reason || "Manual update"}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontWeight: 800, color: isInward ? "var(--success)" : "var(--danger)", fontSize: "0.875rem" }}>
                          {isInward ? "+" : ""}{m.quantity}
                        </p>
                        <p style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", marginTop: "0.125rem" }}>{formatDate(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>No stock movements recorded yet.</p>
            )}
          </div>
        </div>

      </div>
      <style>{`
        .stock-operations-layout {
          grid-template-columns: 1fr 1.3fr;
        }
        @media (max-width: 768px) {
          .stock-operations-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
