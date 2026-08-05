"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { motion } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { QuickCategoryModal } from "@/components/ui/quick-category-modal";
import { ComboboxInput } from "@/components/ui/combobox-input";
import {
  GENDER_OPTIONS,
  SLEEVE_TYPE_OPTIONS,
  GST_SLAB_OPTIONS,
  COMMON_COLORS,
  SIZE_GROUPS,
  ALL_COMMON_SIZES,
  SizeGroupKey,
} from "@/lib/constants";

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
  variants: { color: string; size: string; stock: number; minStock: number }[];
}

export default function NewProductPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"basic" | "pricing" | "variants">("basic");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data,
  });

  const {
    register,
    handleSubmit,
    control,
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
      variants: [{ color: "White", size: "M", stock: 0, minStock: 5 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  const [activeSizeCategory, setActiveSizeCategory] = useState<SizeGroupKey>("ADULT");
  const selectedGender = watch("gender");

  useEffect(() => {
    if (selectedGender === "BABY") {
      setActiveSizeCategory("BABY");
    } else if (selectedGender === "KIDS") {
      setActiveSizeCategory("KIDS");
    } else {
      setActiveSizeCategory("ADULT");
    }
  }, [selectedGender]);

  const mutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const res = await api.post("/products", {
        ...data,
        gstPercent: Number(data.gstPercent),
        purchasePrice: Number(data.purchasePrice),
        wholesalePrice: Number(data.wholesalePrice),
        retailPrice: data.retailPrice ? Number(data.retailPrice) : undefined,
        variants: data.variants.map((v) => ({
          ...v,
          stock: Number(v.stock),
          minStock: Number(v.minStock),
        })),
      });
      return res.data;
    },
    onSuccess: (product) => {
      toast.success("Product created successfully!");
      router.push(`/inventory/${product.id}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || "Failed to create product");
    },
  });

  const tabs = [
    { key: "basic", label: "Basic Info" },
    { key: "pricing", label: "Pricing & GST" },
    { key: "variants", label: `Variants (${fields.length})` },
  ] as const;

  return (
    <div style={{ maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/inventory" className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
            Add New Product
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Fill in the details to add a product to inventory
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Category *</label>
                    <button
                      type="button"
                      onClick={() => setCategoryModalOpen(true)}
                      className="btn btn-ghost btn-xs text-[var(--brand-600)] hover:underline"
                      style={{ fontSize: "0.75rem", padding: "0 0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      <Plus size={12} /> Add Category
                    </button>
                  </div>
                  <Controller
                    control={control}
                    name="categoryId"
                    rules={{ required: "Category is required" }}
                    render={({ field }) => (
                      <SearchableSelect
                        options={
                          categories?.map((cat: { id: string; name: string }) => ({
                            value: cat.id,
                            label: cat.name,
                          })) || []
                        }
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select category..."
                        searchPlaceholder="Search category..."
                        error={!!errors.categoryId}
                      />
                    )}
                  />
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
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sleeve Type</label>
                  <select className="form-input form-select" {...register("sleeveType")}>
                    <option value="">Select type</option>
                    {SLEEVE_TYPE_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
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
                    {GST_SLAB_OPTIONS.map((slab) => (
                      <option key={slab.value} value={slab.value}>
                        {slab.label}
                      </option>
                    ))}
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

            {activeTab === "variants" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    Add color and size variants with stock quantities
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => append({ color: "", size: "M", stock: 0, minStock: 5 })}
                  >
                    <Plus size={14} />
                    Add Variant
                  </button>
                </div>

                {/* Quick add buttons with Group Filter Tabs */}
                <div style={{ marginBottom: "1.25rem", background: "var(--bg-tertiary)", padding: "0.875rem", borderRadius: "0.625rem", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Quick add sizes:</p>
                    {/* Category Filter Pills */}
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      {SIZE_GROUPS.map((group) => (
                        <button
                          key={group.key}
                          type="button"
                          className={`btn btn-xs ${activeSizeCategory === group.key ? "btn-primary" : "btn-ghost"}`}
                          style={{ fontSize: "0.6875rem", padding: "0.2rem 0.5rem", borderRadius: "9999px" }}
                          onClick={() => setActiveSizeCategory(group.key)}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    {SIZE_GROUPS.find((g) => g.key === activeSizeCategory)?.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem" }}
                        onClick={() => append({ color: "White", size, stock: 0, minStock: 5 })}
                      >
                        + {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr auto auto auto",
                        gap: "0.625rem",
                        alignItems: "end",
                        background: "var(--bg-tertiary)",
                        padding: "0.75rem",
                        borderRadius: "0.625rem",
                      }}
                    >
                      <div>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Color</label>
                        <Controller
                          control={control}
                          name={`variants.${index}.color`}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <ComboboxInput
                              value={field.value}
                              onChange={field.onChange}
                              options={COMMON_COLORS}
                              placeholder="e.g. White, Dark Blue..."
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Size</label>
                        <Controller
                          control={control}
                          name={`variants.${index}.size`}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <ComboboxInput
                              value={field.value}
                              onChange={field.onChange}
                              options={ALL_COMMON_SIZES}
                              placeholder="e.g. M, XL, 32..."
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Stock</label>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          style={{ width: "80px" }}
                          {...register(`variants.${index}.stock`)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Min Stock</label>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          style={{ width: "80px" }}
                          {...register(`variants.${index}.minStock`)}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon"
                        style={{ color: "var(--danger)", alignSelf: "flex-end" }}
                        onClick={() => remove(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom Add Variant Button */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    width: "100%",
                    marginTop: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    borderStyle: "dashed",
                    borderWidth: "1.5px",
                    padding: "0.6875rem",
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    const lastVariant = fields.length > 0 ? watch(`variants.${fields.length - 1}`) : null;
                    append({
                      color: lastVariant?.color || "",
                      size: lastVariant?.size || "M",
                      stock: 0,
                      minStock: 5,
                    });
                  }}
                >
                  <Plus size={16} />
                  Add Another Variant
                </button>
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
                  const order = ["basic", "pricing", "variants"] as const;
                  const currentIdx = order.indexOf(activeTab);
                  setActiveTab(order[currentIdx - 1]);
                }}
              >
                ← Previous
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/inventory" className="btn btn-secondary">Cancel</Link>
            {activeTab !== "variants" ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const order = ["basic", "pricing", "variants"] as const;
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
                {mutation.isPending ? "Creating..." : "Create Product"}
              </button>
            )}
          </div>
        </div>
      </form>

      <QuickCategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        onSuccess={(newCat) => setValue("categoryId", newCat.id)}
      />
    </div>
  );
}
