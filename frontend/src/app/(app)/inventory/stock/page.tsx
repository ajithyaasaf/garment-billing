"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, ArrowUpRight, ArrowDownRight, ClipboardList, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface SearchProduct {
  id: string;
  name: string;
  sku: string;
  wholesalePrice: number;
  category?: { name: string };
  variants: { id: string; color: string; size: string; stock: number }[];
}

export default function StockOperationsPage() {
  const qc = useQueryClient();

  // Stock operation form states
  const [opType, setOpType] = useState<"inward" | "return" | "damaged">("inward");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");

  // Fetch product list for dropdown selection
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products-list-stock"],
    queryFn: async () => (await api.get("/products?limit=100")).data,
  });

  const productsList: SearchProduct[] = productsData?.data || [];

  const selectedProduct = productsList.find((p) => p.id === selectedProductId) || null;

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = productsList.find((p) => p.id === prodId);
    if (prod && prod.variants?.length > 0) {
      setSelectedVariantId(prod.variants[0].id);
    } else {
      setSelectedVariantId("");
    }
  };

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
        reason: reason.trim() || undefined,
        ...(opType === "inward" && { reference: reference.trim() || undefined }),
      };
      return (await api.post(`/stock/${opType}`, payload)).data;
    },
    onSuccess: () => {
      toast.success(`Stock ${opType} recorded successfully!`);
      // Reset form
      setSelectedProductId("");
      setSelectedVariantId("");
      setQuantity(1);
      setReason("");
      setReference("");

      // Invalidate queries
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-list-stock"] });
      refetchMovements();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to record stock operation");
    },
  });

  const handleApplyStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error("Please select a product first");
      return;
    }
    if (!selectedVariantId) {
      toast.error("Please select a product variant");
      return;
    }
    if (quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    operationMutation.mutate();
  };

  const handleSelectLowStock = (variant: any) => {
    const prodId = variant.productId || variant.product?.id;
    const prod = productsList.find((p) => p.id === prodId);

    if (prod) {
      setSelectedProductId(prod.id);
      setSelectedVariantId(variant.id);
      setOpType("inward");
      toast.info(`Selected ${prod.name} (${variant.color} / ${variant.size}) for Inwarding`);
    } else {
      toast.error("Product details loading, please try again in a moment.");
    }
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
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Perform inwarding, returns, and track inventory movements
          </p>
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
              <div
                style={{
                  display: "flex",
                  gap: "0.25rem",
                  background: "var(--bg-tertiary)",
                  padding: "0.25rem",
                  borderRadius: "0.5rem",
                  marginBottom: "1.25rem",
                }}
              >
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
                {/* Product SearchableSelect */}
                <div className="form-group">
                  <label className="form-label">Select Product *</label>
                  <SearchableSelect
                    options={
                      productsList.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${p.sku})`,
                        sublabel: `${p.category?.name || "Garment"} • ${p.variants?.length || 0} variants`,
                      })) || []
                    }
                    value={selectedProductId}
                    onChange={handleProductChange}
                    placeholder={isLoadingProducts ? "Loading products..." : "Search product by name or SKU..."}
                  />
                </div>

                {/* Variant selection */}
                {selectedProduct ? (
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
                        placeholder="e.g. Stock inwarding, customer return, transit damage..."
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
                ) : (
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      borderRadius: "0.625rem",
                      padding: "1.25rem",
                      textAlign: "center",
                      border: "1px dashed var(--border-color)",
                    }}
                  >
                    <PackageCheck size={28} color="var(--brand-600)" style={{ margin: "0 auto 0.5rem" }} />
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                      Select a product above
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      Choose a product or click an item under Low Stock Alerts below to inward or adjust stock.
                    </p>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Interactive Low stock indicators */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <AlertTriangle size={15} color="var(--warning)" />
              <span style={{ fontWeight: 600 }}>Low Stock Alerts</span>
            </div>
            <div className="card-body" style={{ maxHeight: "300px", overflowY: "auto", padding: 0 }}>
              {isLoadingLowStock ? (
                <div style={{ padding: "1rem" }}>
                  <div className="skeleton" style={{ height: "3rem" }} />
                </div>
              ) : lowStockData && lowStockData.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {lowStockData.map((variant: any, idx: number) => (
                    <div
                      key={variant.id || idx}
                      onClick={() => handleSelectLowStock(variant)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid var(--border-color)",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      className="hover:bg-[var(--bg-tertiary)]"
                    >
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>
                          {variant.product?.name}
                        </p>
                        <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                          Color: {variant.color} · Size: {variant.size} · SKU: {variant.product?.sku}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="badge badge-danger" style={{ fontWeight: 700 }}>
                          {variant.stock} Left
                        </span>
                        <span
                          className="btn btn-ghost btn-xs text-[var(--brand-600)]"
                          style={{ fontSize: "0.75rem", padding: "0.125rem 0.375rem" }}
                        >
                          + Inward
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem" }}>
                  All variants are healthy! No low stock alerts.
                </p>
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
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton" style={{ height: "3.5rem" }} />
                ))}
              </div>
            ) : movementsData?.data?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {movementsData.data.map((m: any, idx: number) => {
                  const isInward = m.type === "INWARD" || m.type === "RETURN" || m.quantity > 0;
                  return (
                    <Link
                      key={m.id || idx}
                      href={m.product?.id ? `/inventory/${m.product.id}` : "#"}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem",
                        background: "var(--bg-tertiary)",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--border-color)",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "transform 0.1s, border-color 0.15s",
                      }}
                      className="hover:border-[var(--brand-500)]"
                    >
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div
                          style={{
                            width: "2rem",
                            height: "2rem",
                            borderRadius: "0.375rem",
                            background: isInward ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
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
                          {isInward ? "+" : ""}
                          {m.quantity}
                        </p>
                        <p style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", marginTop: "0.125rem" }}>{formatDate(m.createdAt)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                No stock movements recorded yet.
              </p>
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
