"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { motion } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, debounce } from "@/lib/utils";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { QuickCustomerModal } from "@/components/ui/quick-customer-modal";

interface QuotationForm {
  customerId: string;
  discountAmount: number;
  notes: string;
  validUntil: string;
  items: {
    productId: string;
    variantId: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number;
    wholesalePrice?: number;
    retailPrice?: number;
    gstPercent: number;
    discount: number;
    variants?: { id: string; color: string; size: string }[];
  }[];
}

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") || "";
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedProductSearch(val as string), 300), []
  );

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => (await api.get("/customers?limit=100")).data,
  });

  const { data: productResults } = useQuery({
    queryKey: ["product-search-quot", debouncedProductSearch],
    queryFn: async () => {
      if (!debouncedProductSearch) return { data: [] };
      return (await api.get(`/products?search=${debouncedProductSearch}&limit=10`)).data;
    },
    enabled: debouncedProductSearch.length > 1,
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<QuotationForm>({
    defaultValues: { customerId: preselectedCustomerId, discountAmount: 0, items: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");
  const watchDiscount = watch("discountAmount") || 0;
  const selectedCustomerId = watch("customerId");

  // Determine if selected customer is RETAIL or WHOLESALE
  const selectedCustomerObj = customers?.data?.find((c: any) => c.id === selectedCustomerId);
  const isRetailCustomer = selectedCustomerObj?.type === "RETAIL";

  // Dynamic pricing updates when customer changes
  useEffect(() => {
    if (watchItems && watchItems.length > 0) {
      watchItems.forEach((item, index) => {
        const targetPrice = isRetailCustomer
          ? (item.retailPrice ?? item.wholesalePrice ?? item.unitPrice)
          : (item.wholesalePrice ?? item.unitPrice);
        if (targetPrice !== undefined && Number(targetPrice) !== Number(item.unitPrice)) {
          setValue(`items.${index}.unitPrice`, Number(targetPrice));
        }
      });
    }
  }, [isRetailCustomer, selectedCustomerId, setValue]);

  const subtotal = watchItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100), 0);
  const taxAmount = watchItems.reduce((sum, item) => {
    const lineTotal = (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
    return sum + lineTotal * ((item.gstPercent || 0) / 100);
  }, 0);
  const totalAmount = subtotal + taxAmount - watchDiscount;

  const mutation = useMutation({
    mutationFn: async (data: QuotationForm) => {
      const res = await api.post("/quotations", {
        ...data,
        discountAmount: Number(data.discountAmount),
        items: data.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          gstPercent: Number(item.gstPercent),
          discount: Number(item.discount),
        })),
      });
      return res.data;
    },
    onSuccess: (q) => { toast.success("Quotation created!"); router.push(`/quotations/${q.id}`); },
    onError: () => toast.error("Failed to create quotation"),
  });

  const addProduct = (product: {
    id: string; name: string; sku: string; wholesalePrice: number; retailPrice?: number; gstPercent: number;
    variants: { id: string; color: string; size: string }[];
  }) => {
    const variant = product.variants[0];
    const resolvedPrice = isRetailCustomer
      ? (product.retailPrice || product.wholesalePrice)
      : product.wholesalePrice;

    append({
      productId: product.id,
      variantId: variant?.id || "",
      productName: product.name,
      color: variant?.color || "",
      size: variant?.size || "",
      quantity: 1,
      unitPrice: resolvedPrice,
      wholesalePrice: product.wholesalePrice,
      retailPrice: product.retailPrice || product.wholesalePrice,
      gstPercent: product.gstPercent,
      discount: 0,
      variants: product.variants
    });
    setProductSearch(""); setShowProductSearch(false);
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/quotations" className="btn btn-ghost btn-sm btn-icon"><ArrowLeft size={16} /></Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Create Quotation</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Generate a price quotation for customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div className="new-transaction-layout" style={{ display: "grid", gap: "1.25rem", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 600 }}>Customer</span></div>
              <div className="card-body">
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Select Customer *</label>
                    <button
                      type="button"
                      style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--brand-600)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                      onClick={() => setShowQuickCustomerModal(true)}
                    >
                      <Plus size={12} /> Quick Add
                    </button>
                  </div>
                  <Controller
                    control={control}
                    name="customerId"
                    rules={{ required: "Customer is required" }}
                    render={({ field }) => (
                      <SearchableSelect
                        options={
                          customers?.data?.map((c: { id: string; shopName?: string; ownerName: string; type?: string }) => ({
                            value: c.id,
                            label: c.shopName || c.ownerName,
                            sublabel: c.shopName ? c.ownerName : "Retail Customer",
                          })) || []
                        }
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select customer..."
                        searchPlaceholder="Search customer by shop or owner name..."
                        error={!!errors.customerId}
                      />
                    )}
                  />
                  {errors.customerId && <span className="form-error">{errors.customerId.message}</span>}
                </div>
                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label className="form-label">Valid Until</label>
                  <input type="date" className="form-input" {...register("validUntil")} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Quotation Items</span>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowProductSearch(true)}>
                  <Plus size={14} /> Add Product
                </button>
              </div>
              <div className="card-body">
                {showProductSearch && (
                  <div style={{ position: "relative", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Search size={15} color="var(--text-tertiary)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
                        <input className="form-input" style={{ paddingLeft: "2.25rem" }} placeholder="Search product..." value={productSearch} autoFocus
                          onChange={(e) => { setProductSearch(e.target.value); debouncedSetSearch(e.target.value); }} />
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowProductSearch(false)}>Cancel</button>
                    </div>
                    {productResults?.data?.length > 0 && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.625rem", boxShadow: "var(--shadow-lg)", zIndex: 20, overflow: "hidden" }}>
                        {productResults.data.map((product: { id: string; name: string; sku: string; wholesalePrice: number; retailPrice?: number; gstPercent: number; category: { name: string }; variants: { id: string; color: string; size: string }[] }) => (
                          <button key={product.id} type="button" onClick={() => addProduct(product)}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "none", border: "none", borderBottom: "1px solid var(--border-color)", cursor: "pointer", textAlign: "left" }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{product.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{product.sku} · {product.category.name}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: 700, color: "var(--brand-600)" }}>
                                {isRetailCustomer
                                  ? formatCurrency(product.retailPrice || product.wholesalePrice)
                                  : formatCurrency(product.wholesalePrice)
                                }
                              </div>
                              {isRetailCustomer && !product.retailPrice && (
                                <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 400 }}>
                                  Wholesale price fallback
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {fields.length > 0 ? (
                  <div className="table-container">
                    <table className="table">
                      <thead><tr><th>Product</th><th>Variant</th><th>Qty</th><th>Price</th><th>GST%</th><th>Disc%</th><th>Total</th><th></th></tr></thead>
                      <tbody>
                        {fields.map((field, index) => {
                          const item = watchItems[index];
                          const lineTotal = (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
                          const lineGst = lineTotal * ((item.gstPercent || 0) / 100);
                          return (
                            <tr key={field.id}>
                              <td style={{ fontWeight: 500 }}>{field.productName}</td>
                              <td>
                                {field.variants && field.variants.length > 0 ? (
                                  <select
                                    className="form-input form-select"
                                    style={{ width: "120px", fontSize: "0.75rem", padding: "2px 6px", height: "auto" }}
                                    {...register(`items.${index}.variantId`, {
                                      required: true,
                                      onChange: (e) => {
                                        const selected = field.variants?.find((v) => v.id === e.target.value);
                                        if (selected) {
                                          setValue(`items.${index}.color`, selected.color);
                                          setValue(`items.${index}.size`, selected.size);
                                        }
                                      }
                                    })}
                                  >
                                    {field.variants.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.color} / {v.size}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                    {field.color} / {field.size}
                                  </div>
                                )}
                              </td>
                              <td><input type="number" min="1" className="form-input" style={{ width: "70px" }} {...register(`items.${index}.quantity`, { min: 1 })} /></td>
                              <td><input type="number" step="0.01" className="form-input" style={{ width: "90px" }} {...register(`items.${index}.unitPrice`)} /></td>
                              <td><select className="form-input form-select" style={{ width: "70px" }} {...register(`items.${index}.gstPercent`)}><option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option></select></td>
                              <td><input type="number" min="0" max="100" className="form-input" style={{ width: "65px" }} {...register(`items.${index}.discount`)} /></td>
                              <td style={{ fontWeight: 700 }}>{formatCurrency(lineTotal + lineGst)}</td>
                              <td><button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ color: "var(--danger)" }} onClick={() => remove(index)}><Trash2 size={14} /></button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: "2rem" }}>
                    <p style={{ fontSize: "0.875rem" }}>Search and add products above</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-input" rows={3} placeholder="Quotation notes..." {...register("notes")} style={{ resize: "vertical" }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: "sticky", top: "80px" }}>
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 600 }}>Summary</span></div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {[{ label: "Subtotal", value: subtotal }, { label: "GST", value: taxAmount }, { label: "Discount", value: -watchDiscount }].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                    <span style={{ fontWeight: 500 }}>{formatCurrency(Math.abs(row.value))}</span>
                  </div>
                ))}
                <div style={{ height: "1px", background: "var(--border-color)" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 800, color: "var(--brand-600)", fontSize: "1.125rem" }}>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Discount (₹)</label>
                  <input type="number" min="0" step="0.01" className="form-input" {...register("discountAmount")} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={mutation.isPending || fields.length === 0}>
                  {mutation.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
                  {mutation.isPending ? "Creating..." : "Create Quotation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .new-transaction-layout {
          grid-template-columns: 2fr 1fr;
        }
        @media (max-width: 768px) {
          .new-transaction-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <QuickCustomerModal
        open={showQuickCustomerModal}
        onOpenChange={setShowQuickCustomerModal}
        onSuccess={(customer) => {
          setValue("customerId", customer.id);
        }}
      />
    </div>
  );
}
