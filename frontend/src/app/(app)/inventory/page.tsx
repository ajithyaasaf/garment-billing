"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Filter, RefreshCw, Edit, Trash2, Copy, Package, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, debounce } from "@/lib/utils";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { GENDER_OPTIONS, formatGender } from "@/lib/constants";

interface Product {
  id: string;
  name: string;
  sku: string;
  brand?: string;
  gender: string;
  gstPercent: number;
  wholesalePrice: number;
  purchasePrice: number;
  category: { name: string };
  variants: { id: string; color: string; size: string; stock: number; minStock: number }[];
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const debouncedSetSearch = useCallback(
    debounce((val: string) => {
      setDebouncedSearch(val as string);
      setPage(1);
    }, 300),
    []
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["products", debouncedSearch, page, categoryFilter, genderFilter, lowStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: debouncedSearch,
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...(genderFilter && { gender: genderFilter }),
        ...(lowStockOnly && { lowStock: "true" }),
      });
      const res = await api.get(`/products?${params}`);
      return res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data;
    },
  });

  const getTotalStock = (variants: Product["variants"]) =>
    variants.reduce((sum, v) => sum + v.stock, 0);

  const hasLowStock = (variants: Product["variants"]) =>
    variants.some((v) => v.stock <= v.minStock);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      refetch();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/products/${id}/duplicate`);
      toast.success("Product duplicated");
      refetch();
    } catch {
      toast.error("Failed to duplicate product");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
            Inventory
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {data?.meta?.total || 0} products
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/inventory/stock" className="btn btn-secondary btn-sm flex-1 sm:flex-initial">
            <RefreshCw size={15} />
            Stock Operations
          </Link>
          <Link href="/inventory/new" className="btn btn-primary btn-sm flex-1 sm:flex-initial">
            <Plus size={15} />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            color="var(--text-tertiary)"
            style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            className="form-input w-full"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="Search by name, SKU, brand..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              debouncedSetSearch(e.target.value);
            }}
          />
        </div>

        <select
          className="form-input form-select w-full sm:w-auto sm:min-w-[140px]"
          value={genderFilter}
          onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Gender</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        {categories?.length > 0 && (
          <SearchableSelect
            options={[
              { value: "", label: "All Categories" },
              ...categories.map((cat: { id: string; name: string }) => ({
                value: cat.id,
                label: cat.name,
              })),
            ]}
            value={categoryFilter}
            onChange={(val) => {
              setCategoryFilter(val);
              setPage(1);
            }}
            placeholder="All Categories"
            searchPlaceholder="Search category..."
            className="w-full sm:w-auto sm:min-w-[160px]"
          />
        )}

        <button
          className={`btn btn-sm w-full sm:w-auto ${lowStockOnly ? "btn-primary" : "btn-secondary"}`}
          onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
        >
          <AlertTriangle size={14} />
          Low Stock
        </button>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="table-container"
      >
        {isLoading ? (
          <div style={{ padding: "2rem" }}>
            {Array(8).fill(null).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "3rem", marginBottom: "0.5rem", borderRadius: "0.375rem" }}
              />
            ))}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Gender</th>
                <th>Price</th>
                <th>Stock</th>
                <th>GST</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.length ? (
                data.data.map((product: Product, i: number) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div
                          style={{
                            width: "2rem",
                            height: "2rem",
                            borderRadius: "0.5rem",
                            background: "var(--bg-tertiary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Package size={14} color="var(--text-tertiary)" />
                        </div>
                        <div>
                          <Link
                            href={`/inventory/${product.id}`}
                            className="text-[var(--text-primary)] hover:text-blue-600 hover:underline transition-colors"
                            style={{
                              fontWeight: 600,
                              fontSize: "0.875rem",
                            }}
                          >
                            {product.name}
                          </Link>
                          {product.brand && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                              {product.brand}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.75rem", background: "var(--bg-tertiary)", padding: "0.125rem 0.375rem", borderRadius: "0.25rem" }}>
                        {product.sku}
                      </code>
                    </td>
                    <td>{product.category.name}</td>
                    <td>
                      <span className="badge badge-gray">
                        {formatGender(product.gender)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(product.wholesalePrice)}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        Cost: {formatCurrency(product.purchasePrice)}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: hasLowStock(product.variants)
                              ? "var(--danger)"
                              : "var(--text-primary)",
                          }}
                        >
                          {getTotalStock(product.variants)}
                        </span>
                        {hasLowStock(product.variants) && (
                          <AlertTriangle size={13} color="var(--warning)" />
                        )}
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                          ({product.variants.length} variants)
                        </span>
                      </div>
                    </td>
                    <td>{product.gstPercent}%</td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.375rem" }}>
                        <Link href={`/inventory/${product.id}`} className="btn btn-ghost btn-sm btn-icon" title="View Details">
                          <Eye size={14} />
                        </Link>
                        <Link href={`/inventory/${product.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                          <Edit size={14} />
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => handleDuplicate(product.id)}
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: "var(--danger)" }}
                          onClick={() => handleDelete(product.id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <Package size={40} />
                      <p style={{ fontWeight: 600 }}>No products found</p>
                      <p style={{ fontSize: "0.8125rem" }}>
                        {search ? "Try different search terms" : "Add your first product"}
                      </p>
                      <Link href="/inventory/new" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }}>
                        <Plus size={14} />
                        Add Product
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1.25rem",
          }}
        >
          <button
            className="btn btn-secondary btn-sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Page {page} of {data.meta.totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page === data.meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
