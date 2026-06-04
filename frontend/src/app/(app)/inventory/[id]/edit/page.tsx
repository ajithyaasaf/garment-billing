"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";

interface ProductForm {
  name: string;
  sku: string;
  categoryId: string;
  brand: string;
  gender: string;
  sleeveType: string;
  gstPercent: number;
  purchasePrice: number;
  wholesalePrice: number;
  retailPrice: number;
  description: string;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<"basic" | "pricing">("basic");

  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["product-edit", id],
    queryFn: async () => (await api.get(`/products/${id}`)).data,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<ProductForm>({
    defaultValues: {
      gstPercent: 5,
      purchasePrice: 0,
      wholesalePrice: 0,
      retailPrice: 0,
      gender: "UNISEX",
    },
  });

  useEffect(() => {
    if (product) {
      setValue("name", product.name);
      setValue("sku", product.sku);
      setValue("categoryId", product.categoryId);
      setValue("brand", product.brand || "");
      setValue("gender", product.gender);
      setValue("sleeveType", product.sleeveType || "");
      setValue("gstPercent", product.gstPercent);
      setValue("purchasePrice", product.purchasePrice);
      setValue("wholesalePrice", product.wholesalePrice);
      setValue("retailPrice", product.retailPrice || 0);
      setValue("description", product.description || "");
    }
  }, [product, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const res = await api.put(`/products/${id}`, {
        ...data,
        gstPercent: Number(data.gstPercent),
        purchasePrice: Number(data.purchasePrice),
        wholesalePrice: Number(data.wholesalePrice),
        retailPrice: data.retailPrice ? Number(data.retailPrice) : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Product updated successfully!");
      router.push(`/inventory/${id}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || "Failed to update product");
    },
  });

  if (isLoadingProduct) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="skeleton" style={{ width: "200px", height: "1.5rem", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ width: "100%", height: "250px" }} />
      </div>
    );
  }

  const tabs = [
    { key: "basic", label: "Basic Info" },
    { key: "pricing", label: "Pricing & GST" },
  ] as const;

  return (
    <div style={{ maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href={`/inventory/${id}`} className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
            Edit Product
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Modify product base settings and pricing
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            background: "var(--bg-tertiary)",
            padding: "0.25rem",
            borderRadius: "0.625rem",
            marginBottom: "1.25rem",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: activeTab === tab.key ? "var(--bg-secondary)" : "transparent",
                color: activeTab === tab.key ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: activeTab === tab.key ? 600 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                boxShadow: activeTab === tab.key ? "var(--shadow-xs)" : "none",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="card-body">
            {activeTab === "basic" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Product Name *</label>
                  <input
                    className={`form-input ${errors.name ? "error" : ""}`}
                    placeholder="e.g. Round Neck Cotton T-Shirt"
                    {...register("name", { required: "Product name is required" })}
                  />
                  {errors.name && <span className="form-error">{errors.name.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">SKU Code *</label>
                  <input
                    className={`form-input ${errors.sku ? "error" : ""}`}
                    placeholder="e.g. TS001"
                    {...register("sku", { required: "SKU is required" })}
                  />
                  {errors.sku && <span className="form-error">{errors.sku.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className={`form-input form-select ${errors.categoryId ? "error" : ""}`}
                    {...register("categoryId", { required: "Category is required" })}
                  >
                    <option value="">Select category</option>
                    {categories?.map((cat: { id: string; name: string }) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.categoryId && <span className="form-error">{errors.categoryId.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Sri Brand"
                    {...register("brand")}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-input form-select" {...register("gender")}>
                    <option value="MENS">Men's</option>
                    <option value="WOMENS">Women's</option>
                    <option value="KIDS">Kids</option>
                    <option value="UNISEX">Unisex</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sleeve Type</label>
                  <select className="form-input form-select" {...register("sleeveType")}>
                    <option value="">Select type</option>
                    <option value="Half Sleeve">Half Sleeve</option>
                    <option value="Full Sleeve">Full Sleeve</option>
                    <option value="Sleeveless">Sleeveless</option>
                    <option value="3/4 Sleeve">3/4 Sleeve</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Optional product description"
                    {...register("description")}
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>
            )}

            {activeTab === "pricing" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Purchase Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`form-input ${errors.purchasePrice ? "error" : ""}`}
                    placeholder="0.00"
                    {...register("purchasePrice", { required: "Purchase price is required", min: 0 })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Your cost price</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Wholesale Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`form-input ${errors.wholesalePrice ? "error" : ""}`}
                    placeholder="0.00"
                    {...register("wholesalePrice", { required: "Wholesale price is required", min: 0 })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Selling price to dealers</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Retail Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    {...register("retailPrice")}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>MRP (optional)</span>
                </div>

                <div className="form-group">
                  <label className="form-label">GST Percentage *</label>
                  <select
                    className="form-input form-select"
                    {...register("gstPercent", { required: true })}
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                {/* Price preview */}
                {watch("wholesalePrice") > 0 && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      background: "var(--bg-tertiary)",
                      borderRadius: "0.625rem",
                      padding: "1rem",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    {[
                      { label: "Base Price", value: watch("wholesalePrice") },
                      { label: "GST Amount", value: watch("wholesalePrice") * (watch("gstPercent") / 100) },
                      { label: "Total Price", value: watch("wholesalePrice") * (1 + watch("gstPercent") / 100) },
                    ].map((item) => (
                      <div key={item.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{item.label}</div>
                        <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                          ₹{Number(item.value).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.25rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {activeTab !== "basic" && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const order = ["basic", "pricing"] as const;
                  const currentIdx = order.indexOf(activeTab);
                  setActiveTab(order[currentIdx - 1]);
                }}
              >
                ← Previous
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href={`/inventory/${id}`} className="btn btn-secondary">Cancel</Link>
            {activeTab !== "pricing" ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const order = ["basic", "pricing"] as const;
                  const currentIdx = order.indexOf(activeTab);
                  setActiveTab(order[currentIdx + 1]);
                }}
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
                {mutation.isPending ? "Updating..." : "Save Product"}
              </button>
            )}
          </div>
        </div>
      </form>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
