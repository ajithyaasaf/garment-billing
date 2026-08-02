"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Edit, Copy, Package, Trash2, ShieldAlert, BarChart3, RotateCw, History } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatGender } from "@/lib/constants";
import Link from "next/link";

interface Variant {
  id: string;
  color: string;
  size: string;
  stock: number;
  minStock: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params.id as string;
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await api.get(`/products/${id}`)).data,
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => (await api.post(`/products/${id}/duplicate`)).data,
    onSuccess: (newProd) => {
      toast.success("Product duplicated successfully!");
      qc.invalidateQueries({ queryKey: ["products"] });
      router.push(`/inventory/${newProd.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to duplicate product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => await api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted successfully!");
      qc.invalidateQueries({ queryKey: ["products"] });
      router.push("/inventory");
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ variantId, stock }: { variantId: string; stock: number }) =>
      (await api.patch(`/products/variants/${variantId}/stock`, { stock })).data,
    onSuccess: () => {
      toast.success("Stock level updated successfully!");
      setAdjustingId(null);
      refetch();
    },
    onError: () => {
      toast.error("Failed to update stock");
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate();
    }
  };

  const handleStartAdjust = (v: Variant) => {
    setAdjustingId(v.id);
    setNewStockVal(v.stock);
  };

  const handleSaveAdjust = (variantId: string) => {
    adjustStockMutation.mutate({ variantId, stock: Number(newStockVal) });
  };

  if (isLoading) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="skeleton" style={{ width: "200px", height: "1.5rem", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ width: "100%", height: "250px" }} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--danger)", fontWeight: 600 }}>Product not found or failed to load.</p>
        <Link href="/inventory" className="btn btn-secondary" style={{ marginTop: "1rem" }}>Back to Inventory</Link>
      </div>
    );
  }

  const totalStock = product.variants?.reduce((sum: number, v: any) => sum + v.stock, 0) || 0;

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/inventory" className="btn btn-ghost btn-sm btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{product.name}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>SKU: <code style={{ color: "var(--brand-600)", fontWeight: 600 }}>{product.sku}</code> · {product.category?.name}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href={`/inventory/${id}/edit`} className="btn btn-secondary btn-sm">
            <Edit size={14} />
            Edit Product
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}>
            <Copy size={14} />
            Duplicate
          </button>
          <button className="btn btn-secondary btn-sm" style={{ color: "var(--danger)" }} onClick={handleDelete} disabled={deleteMutation.isPending}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      <div className="inventory-detail-layout" style={{ display: "grid", gap: "1.25rem", alignItems: "start" }}>
        {/* Left Column - Variants & Stock Adjustment */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Variants Table */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Stock Variants</span>
              <span className="badge badge-gray">{product.variants?.length || 0} Variants</span>
            </div>
            <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Color</th>
                    <th>Size</th>
                    <th>Stock</th>
                    <th>Min Stock</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants?.map((v: Variant) => {
                    const isLow = v.stock <= v.minStock;
                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600 }}>{v.color}</td>
                        <td><span className="badge badge-gray">{v.size}</span></td>
                        <td>
                          {adjustingId === v.id ? (
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: "80px", padding: "0.25rem 0.5rem" }}
                              value={newStockVal}
                              onChange={(e) => setNewStockVal(Number(e.target.value))}
                              autoFocus
                            />
                          ) : (
                            <span style={{ fontWeight: 700, color: isLow ? "var(--danger)" : "var(--text-primary)" }}>{v.stock}</span>
                          )}
                        </td>
                        <td>{v.minStock}</td>
                        <td>
                          {isLow ? (
                            <span className="badge badge-danger" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              <ShieldAlert size={10} />
                              Low Stock
                            </span>
                          ) : (
                            <span className="badge badge-success">Healthy</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {adjustingId === v.id ? (
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.25rem" }}>
                              <button className="btn btn-primary btn-sm" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleSaveAdjust(v.id)}>Save</button>
                              <button className="btn btn-secondary btn-sm" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} onClick={() => setAdjustingId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button className="btn btn-secondary btn-sm" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleStartAdjust(v)}>
                              Adjust Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Log / Stock Movements */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <History size={16} color="var(--brand-600)" />
              <span style={{ fontWeight: 600 }}>Stock Movements Activity Log</span>
            </div>
            <div className="card-body">
              {product.stockMovements?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {product.stockMovements.map((move: any, idx: number) => {
                    const isAddition = move.quantity > 0;
                    return (
                      <div key={move.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.625rem", background: "var(--bg-tertiary)", borderRadius: "0.375rem" }}>
                        <div>
                          <span className={`badge ${isAddition ? "badge-success" : "badge-danger"}`} style={{ marginRight: "0.5rem" }}>
                            {move.type}
                          </span>
                          <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{move.reason || "Manual update"}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontWeight: 700, color: isAddition ? "var(--success)" : "var(--danger)" }}>
                            {isAddition ? "+" : ""}{move.quantity}
                          </span>
                          <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "0.125rem" }}>{formatDate(move.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", textAlign: "center", padding: "1rem" }}>No stock movement logged for this product.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Overview & Pricing Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Summary stats */}
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem", background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyItems: "center", flexShrink: 0, justifyContent: "center" }}>
                  <Package size={18} color="var(--brand-600)" />
                </div>
                <div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total Stock Available</p>
                  <p style={{ fontSize: "1.25rem", fontWeight: 800 }}>{totalStock} units</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600 }}>Pricing & Tax Info</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Wholesale Price:</span>
                <span style={{ fontWeight: 700, color: "var(--brand-600)" }}>{formatCurrency(product.wholesalePrice)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Cost Price:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(product.purchasePrice)}</span>
              </div>
              {product.retailPrice && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>MRP/Retail:</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(product.retailPrice)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>GST Slab:</span>
                <span style={{ fontWeight: 600 }}>{product.gstPercent}%</span>
              </div>
            </div>
          </div>

          {/* Product Specifications */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600 }}>Specifications</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8125rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Brand:</span>
                <span style={{ fontWeight: 600 }}>{product.brand || "GarmentOS Default"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Gender:</span>
                <span style={{ fontWeight: 600 }}>{formatGender(product.gender)}</span>
              </div>
              {product.sleeveType && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Sleeve Type:</span>
                  <span style={{ fontWeight: 600 }}>{product.sleeveType}</span>
                </div>
              )}
              {product.description && (
                <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.5rem" }}>
                  <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>Description:</span>
                  <p style={{ color: "var(--text-secondary)", lineHeight: 1.4 }}>{product.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .inventory-detail-layout {
          grid-template-columns: 2fr 1.2fr;
        }
        @media (max-width: 768px) {
          .inventory-detail-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
