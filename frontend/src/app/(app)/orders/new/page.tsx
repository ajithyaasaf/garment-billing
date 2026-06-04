"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, debounce } from "@/lib/utils";
import Link from "next/link";

interface OrderForm {
  customerId: string;
  notes: string;
  items: {
    productId: string;
    variantId: string;
    productName: string;
    color: string;
    size: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") || "";

  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedProductSearch(val as string), 300), []
  );

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => (await api.get("/customers?limit=100")).data,
  });

  const { data: productResults } = useQuery({
    queryKey: ["product-search-order", debouncedProductSearch],
    queryFn: async () => {
      if (!debouncedProductSearch) return { data: [] };
      return (await api.get(`/products?search=${debouncedProductSearch}&limit=10`)).data;
    },
    enabled: debouncedProductSearch.length > 1,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<OrderForm>({
    defaultValues: {
      customerId: preselectedCustomerId,
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");

  // Calculations
  const subtotal = watchItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);

  const mutation = useMutation({
    mutationFn: async (data: OrderForm) => {
      const res = await api.post("/orders", {
        customerId: data.customerId,
        notes: data.notes,
        items: data.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Order created successfully!");
      router.push("/orders");
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || "Failed to create order");
    },
  });

  const addProduct = (product: {
    id: string;
    name: string;
    sku: string;
    wholesalePrice: number;
    variants: { id: string; color: string; size: string; stock: number }[];
  }) => {
    const variant = product.variants[0];
    append({
      productId: product.id,
      variantId: variant?.id || "",
      productName: product.name,
      color: variant?.color || "",
      size: variant?.size || "",
      sku: product.sku,
      quantity: 1,
      unitPrice: product.wholesalePrice,
    });
    setProductSearch("");
    setShowProductSearch(false);
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/orders" className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Create Order</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Place a new sales order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem", alignItems: "start" }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Customer Selection */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Customer Details</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Select Customer *</label>
                  <select
                    className={`form-input form-select ${errors.customerId ? "error" : ""}`}
                    {...register("customerId", { required: "Customer is required" })}
                  >
                    <option value="">Select customer...</option>
                    {customers?.data?.map((c: { id: string; shopName: string; ownerName: string }) => (
                      <option key={c.id} value={c.id}>{c.shopName} – {c.ownerName}</option>
                    ))}
                  </select>
                  {errors.customerId && <span className="form-error">{errors.customerId.message}</span>}
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Order Items</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowProductSearch(true)}
                >
                  <Plus size={14} />
                  Add Product
                </button>
              </div>
              <div className="card-body">
                {/* Product Search */}
                {showProductSearch && (
                  <div style={{ position: "relative", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Search size={15} color="var(--text-tertiary)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          className="form-input"
                          style={{ paddingLeft: "2.25rem" }}
                          placeholder="Search product name or SKU..."
                          value={productSearch}
                          autoFocus
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            debouncedSetSearch(e.target.value);
                          }}
                        />
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowProductSearch(false)}>Cancel</button>
                    </div>

                    {productResults?.data?.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          right: 0,
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "0.625rem",
                          boxShadow: "var(--shadow-lg)",
                          zIndex: 20,
                          overflow: "hidden",
                        }}
                      >
                        {productResults.data.map((product: {
                          id: string;
                          name: string;
                          sku: string;
                          wholesalePrice: number;
                          category: { name: string };
                          variants: { id: string; color: string; size: string; stock: number }[];
                        }) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.75rem 1rem",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              borderBottom: "1px solid var(--border-color)",
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{product.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                {product.sku} · {product.category.name} · {product.variants.length} variants
                              </div>
                            </div>
                            <div style={{ fontWeight: 700, color: "var(--brand-600)" }}>
                              {formatCurrency(product.wholesalePrice)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Items Table */}
                {fields.length > 0 ? (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Variant</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => {
                          const item = watchItems[index];
                          const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                          return (
                            <tr key={field.id}>
                              <td style={{ fontWeight: 500, minWidth: "150px" }}>{field.productName}</td>
                              <td>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                  {field.color} / {field.size}
                                </div>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  className="form-input"
                                  style={{ width: "70px" }}
                                  {...register(`items.${index}.quantity`, { min: 1 })}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-input"
                                  style={{ width: "90px" }}
                                  {...register(`items.${index}.unitPrice`)}
                                />
                              </td>
                              <td style={{ fontWeight: 700 }}>{formatCurrency(lineTotal)}</td>
                              <td>
                                <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ color: "var(--danger)" }} onClick={() => remove(index)}>
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: "2rem" }}>
                    <p style={{ fontSize: "0.875rem" }}>No items added. Search and add products above.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-input" rows={3} placeholder="Order notes..." {...register("notes")} style={{ resize: "vertical" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column – Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "80px" }}>
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Order Summary</span>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Subtotal</span>
                  <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{formatCurrency(subtotal)}</span>
                </div>

                <div style={{ height: "1px", background: "var(--border-color)" }} />

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--brand-600)" }}>
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "0.5rem" }}
                  disabled={mutation.isPending || fields.length === 0}
                >
                  {mutation.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
                  {mutation.isPending ? "Placing..." : "Place Order"}
                </button>

                {fields.length === 0 && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textAlign: "center" }}>
                    Add at least one product
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
