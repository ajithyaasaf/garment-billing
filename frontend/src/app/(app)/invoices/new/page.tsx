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

interface InvoiceForm {
  customerId: string;
  paymentMethod: string;
  paidAmount: number;
  discountAmount: number;
  notes: string;
  dueDate: string;
  items: {
    productId: string;
    variantId: string;
    productName: string;
    color: string;
    size: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    wholesalePrice?: number;
    retailPrice?: number;
    gstPercent: number;
    discount: number;
    variants?: { id: string; color: string; size: string; stock: number }[];
  }[];
}

export default function NewInvoicePage() {
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
    queryKey: ["product-search-invoice", debouncedProductSearch],
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
    setValue,
    formState: { errors },
  } = useForm<InvoiceForm>({
    defaultValues: {
      customerId: preselectedCustomerId,
      paymentMethod: "CASH",
      paidAmount: 0,
      discountAmount: 0,
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");
  const watchDiscount = watch("discountAmount") || 0;
  const watchPaid = watch("paidAmount") || 0;
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

  // Calculations
  const subtotal = watchItems.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
    return sum + itemTotal;
  }, 0);

  const taxAmount = watchItems.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
    return sum + itemTotal * ((item.gstPercent || 0) / 100);
  }, 0);

  const totalAmount = subtotal + taxAmount - watchDiscount;
  const dueAmount = Math.max(0, totalAmount - watchPaid);

  const mutation = useMutation({
    mutationFn: async (data: InvoiceForm) => {
      const res = await api.post("/invoices", {
        ...data,
        paidAmount: Number(data.paidAmount),
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
    onSuccess: (invoice) => {
      toast.success("Invoice created successfully!");
      router.push(`/invoices/${invoice.id}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || "Failed to create invoice");
    },
  });

  const addProduct = (product: {
    id: string;
    name: string;
    sku: string;
    wholesalePrice: number;
    retailPrice?: number;
    gstPercent: number;
    variants: { id: string; color: string; size: string; stock: number }[];
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
      sku: product.sku,
      quantity: 1,
      unitPrice: resolvedPrice,
      wholesalePrice: product.wholesalePrice,
      retailPrice: product.retailPrice || product.wholesalePrice,
      gstPercent: product.gstPercent,
      discount: 0,
      variants: product.variants,
    });
    setProductSearch("");
    setShowProductSearch(false);
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/invoices" className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Create Invoice</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Generate GST invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Customer Selection */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Customer Details</span>
              </div>
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
              </div>
            </div>

            {/* Products */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Invoice Items</span>
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
                          retailPrice?: number;
                          gstPercent: number;
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
                          <th>GST%</th>
                          <th>Disc%</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => {
                          const item = watchItems[index];
                          const lineTotal = (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
                          const lineGst = lineTotal * ((item.gstPercent || 0) / 100);
                          return (
                            <tr key={field.id}>
                              <td style={{ fontWeight: 500, minWidth: "140px" }}>{field.productName}</td>
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
                                        {v.color} / {v.size} ({v.stock} left)
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                    {field.color} / {field.size}
                                  </div>
                                )}
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
                              <td>
                                <select className="form-input form-select" style={{ width: "70px" }} {...register(`items.${index}.gstPercent`)}>
                                  <option value={0}>0%</option>
                                  <option value={5}>5%</option>
                                  <option value={12}>12%</option>
                                  <option value={18}>18%</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="form-input"
                                  style={{ width: "65px" }}
                                  {...register(`items.${index}.discount`)}
                                />
                              </td>
                              <td style={{ fontWeight: 700 }}>{formatCurrency(lineTotal + lineGst)}</td>
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
                  <textarea className="form-input" rows={3} placeholder="Invoice notes..." {...register("notes")} style={{ resize: "vertical" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column – Summary */}
          <div className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-20">
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Payment Summary</span>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {[
                  { label: "Subtotal", value: subtotal },
                  { label: "GST Amount", value: taxAmount },
                  { label: "Discount", value: -watchDiscount },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                    <span style={{ fontWeight: 500, color: row.value < 0 ? "var(--success)" : "var(--text-primary)" }}>
                      {formatCurrency(Math.abs(row.value))}
                    </span>
                  </div>
                ))}

                <div style={{ height: "1px", background: "var(--border-color)" }} />

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--brand-600)" }}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Discount (₹)</label>
                  <input type="number" min="0" step="0.01" className="form-input" {...register("discountAmount")} />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-input form-select" {...register("paymentMethod")}>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Paid (₹)</label>
                  <input type="number" min="0" step="0.01" className="form-input" {...register("paidAmount")} />
                </div>

                <div style={{ height: "1px", background: "var(--border-color)" }} />

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>Due Amount</span>
                  <span style={{ fontWeight: 800, color: dueAmount > 0 ? "var(--danger)" : "var(--success)" }}>
                    {formatCurrency(dueAmount)}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" {...register("dueDate")} />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  disabled={mutation.isPending || fields.length === 0}
                >
                  {mutation.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
                  {mutation.isPending ? "Creating..." : "Create Invoice"}
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
