"use client";

// Next.js App Router - Unified Sales Form
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { motion } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Search, FileText, ShoppingBag, Receipt, Sparkles, Package } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, debounce } from "@/lib/utils";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { QuickCustomerModal } from "@/components/ui/quick-customer-modal";

type DocType = "INVOICE" | "QUOTE";

interface SaleForm {
  customerId: string;
  paymentMethod: string;
  paidAmount: number;
  discountAmount: number;
  notes: string;
  dueDate: string;
  validUntil?: string;
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

function NewSaleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialMode = (searchParams.get("mode") as DocType) || "INVOICE";
  const preselectedCustomerId = searchParams.get("customerId") || "";

  const [docType, setDocType] = useState<DocType>(initialMode);
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedProductSearch(val as string), 300),
    []
  );

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => (await api.get("/customers?limit=100")).data,
  });

  const { data: productResults } = useQuery({
    queryKey: ["product-search-sales", debouncedProductSearch],
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
  } = useForm<SaleForm>({
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

  // State for 1-click Price Tier Override (Bill-Level)
  const [priceTierOverride, setPriceTierOverride] = useState<"RETAIL" | "WHOLESALE" | null>(null);

  // Determine customer & active pricing tier
  const selectedCustomerObj = customers?.data?.find((c: any) => c.id === selectedCustomerId);
  const activePriceTier = priceTierOverride || (selectedCustomerObj?.type === "RETAIL" ? "RETAIL" : "WHOLESALE");
  const isRetailCustomer = activePriceTier === "RETAIL";

  // Reset override when customer changes so it auto-detects the new customer's default tier
  useEffect(() => {
    setPriceTierOverride(null);
  }, [selectedCustomerId]);

  // Fetch top 5 frequent/recommended products
  const { data: frequentProducts } = useQuery({
    queryKey: ["product-frequent-sales", selectedCustomerId],
    queryFn: async () => {
      const url = selectedCustomerId
        ? `/products/frequent?customerId=${selectedCustomerId}&limit=5`
        : `/products/frequent?limit=5`;
      return (await api.get(url)).data;
    },
  });

  // Dynamic pricing updates when pricing tier or customer changes (updates ALL 20+ line items instantly!)
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
  }, [isRetailCustomer, setValue]);

  // Math Calculations
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

  // Unified Submit Mutation
  const mutation = useMutation({
    mutationFn: async (data: SaleForm) => {
      const payload = {
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
      };

      if (docType === "QUOTE") {
        return (await api.post("/quotations", payload)).data;
      } else {
        return (await api.post("/invoices", payload)).data;
      }
    },
    onSuccess: (res) => {
      if (docType === "QUOTE") {
        toast.success("Quotation generated successfully!");
        router.push(`/quotations/${res.id}`);
      } else {
        toast.success("Tax Invoice generated successfully!");
        router.push(`/invoices/${res.id}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to process sale document");
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
      ? (product.retailPrice ?? product.wholesalePrice)
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
      retailPrice: product.retailPrice,
      gstPercent: product.gstPercent,
      discount: 0,
      variants: product.variants,
    });
    setProductSearch("");
    setShowProductSearch(false);
  };

  return (
    <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
      {/* Top Single Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <button onClick={() => router.back()} className="btn btn-ghost btn-sm btn-icon">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
              New Sale
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Create a quote, sales order, or direct GST invoice in one place
            </p>
          </div>
        </div>

        {/* Document Type Selector (Top Segmented Control) */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-tertiary)",
            padding: "3px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
          }}
        >
          {[
            { type: "INVOICE", label: "Tax Invoice", Icon: Receipt },
            { type: "QUOTE", label: "Price Quote", Icon: FileText },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              className={`btn btn-sm ${docType === item.type ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setDocType(item.type as DocType)}
              style={{
                fontSize: "0.8125rem",
                fontWeight: docType === item.type ? 700 : 500,
                padding: "0.375rem 0.875rem",
                borderRadius: "0.375rem",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <item.Icon size={14} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Main Form Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Customer Details Card */}
            <div className="card">
              <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span style={{ fontWeight: 600 }}>Customer Details</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Bill Rates:</span>
                  <div style={{ display: "flex", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "2px", border: "1px solid var(--border-color)" }}>
                    <button
                      type="button"
                      className={`btn btn-xs ${isRetailCustomer ? "btn-primary" : "btn-ghost"}`}
                      style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.625rem" }}
                      onClick={() => setPriceTierOverride("RETAIL")}
                      title="Apply Retail Rates to all items"
                    >
                      🛍️ Retail
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${!isRetailCustomer ? "btn-primary" : "btn-ghost"}`}
                      style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.625rem" }}
                      onClick={() => setPriceTierOverride("WHOLESALE")}
                      title="Apply Wholesale Rates to all items"
                    >
                      🏢 Wholesale
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Select Customer *</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-[var(--brand-600)]"
                      style={{ fontSize: "0.75rem", padding: "0.125rem 0.375rem" }}
                      onClick={() => setShowQuickCustomerModal(true)}
                    >
                      + Quick Add Customer
                    </button>
                  </div>
                  <Controller
                    name="customerId"
                    control={control}
                    rules={{ required: "Customer is required" }}
                    render={({ field }) => (
                      <SearchableSelect
                        options={
                          customers?.data?.map((c: any) => ({
                            value: c.id,
                            label: `${c.shopName ? `${c.shopName} (${c.ownerName})` : c.ownerName}${c.whatsapp ? ` • ${c.whatsapp}` : ""}`,
                            sublabel: `${c.type} • ${c.city || 'Local'}`,
                          })) || []
                        }
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Search customer by name, shop, or phone..."
                        error={!!errors.customerId}
                      />
                    )}
                  />
                  {errors.customerId && (
                    <span className="form-error">{errors.customerId.message}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <span style={{ fontWeight: 600 }}>Line Items</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {fields.length} items added
                </span>
              </div>
              <div className="card-body" style={{ padding: "1.25rem" }}>
                
                {/* Products Table */}
                {fields.length > 0 && (
                  <div className="table-container mb-4" style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                    <table className="table" style={{ fontSize: "0.8125rem" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "35%" }}>Item & Variant</th>
                          <th style={{ width: "15%" }}>Qty</th>
                          <th style={{ width: "20%" }}>Price ({isRetailCustomer ? "Retail" : "Wholesale"})</th>
                          <th style={{ width: "15%" }}>GST %</th>
                          <th style={{ width: "15%", textAlign: "right" }}>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => {
                          const qty = watchItems[index]?.quantity || 0;
                          const price = watchItems[index]?.unitPrice || 0;
                          const gst = watchItems[index]?.gstPercent || 0;
                          const disc = watchItems[index]?.discount || 0;
                          const itemTotal = qty * price * (1 - disc / 100);
                          const itemGst = itemTotal * (gst / 100);
                          const lineTotal = itemTotal + itemGst;

                          return (
                            <tr key={field.id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{field.productName}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                  SKU: {field.sku}
                                </div>

                                {/* Stock Warning Badge */}
                                {(() => {
                                  const selectedVariantId = watchItems[index]?.variantId;
                                  const currentVariant = field.variants?.find((v) => v.id === selectedVariantId) || field.variants?.[0];
                                  const stockCount = currentVariant?.stock ?? 0;
                                  const isExceedingStock = qty > stockCount;

                                  return (
                                    <div style={{ marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
                                      {stockCount > 10 ? (
                                        <span className="badge badge-success" style={{ fontSize: "0.6875rem", padding: "0.125rem 0.375rem" }}>
                                          In Stock: {stockCount}
                                        </span>
                                      ) : stockCount > 0 ? (
                                        <span className="badge badge-warning" style={{ fontSize: "0.6875rem", padding: "0.125rem 0.375rem" }}>
                                          Low Stock: {stockCount}
                                        </span>
                                      ) : (
                                        <span className="badge badge-danger" style={{ fontSize: "0.6875rem", padding: "0.125rem 0.375rem" }}>
                                          Out of Stock
                                        </span>
                                      )}
                                      {isExceedingStock && (
                                        <span style={{ fontSize: "0.6875rem", color: "#dc2626", fontWeight: 700 }}>
                                          Exceeds stock!
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}

                                {field.variants && field.variants.length > 1 && (
                                  <select
                                    className="form-select form-select-sm mt-1"
                                    {...register(`items.${index}.variantId`)}
                                    onChange={(e) => {
                                      const v = field.variants?.find((x) => x.id === e.target.value);
                                      if (v) {
                                        setValue(`items.${index}.color`, v.color);
                                        setValue(`items.${index}.size`, v.size);
                                      }
                                    }}
                                  >
                                    {field.variants.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.color} / {v.size} (Stock: {v.stock})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  className="form-input form-input-sm"
                                  style={{ minWidth: "75px", padding: "0.375rem 0.5rem", fontWeight: 600, textAlign: "center" }}
                                  {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-input form-input-sm"
                                  style={{ minWidth: "90px", padding: "0.375rem 0.5rem", fontWeight: 600 }}
                                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="form-input form-input-sm"
                                  style={{ minWidth: "65px", padding: "0.375rem 0.5rem", fontWeight: 600 }}
                                  {...register(`items.${index}.gstPercent`, { valueAsNumber: true })}
                                />
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>
                                {formatCurrency(lineTotal)}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm btn-icon text-red-500"
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add Product Search Trigger */}
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <Search
                        size={15}
                        style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: "2.25rem" }}
                        placeholder="Search product by name or SKU to add..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          debouncedSetSearch(e.target.value);
                          setShowProductSearch(true);
                        }}
                        onFocus={() => setShowProductSearch(true)}
                      />
                    </div>
                  </div>

                  {/* Immediate Frequent Suggestions / Search Autocomplete Dropdown Overlay */}
                  {showProductSearch && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-lg)",
                        boxShadow: "var(--shadow-lg)",
                        zIndex: 30,
                        marginTop: "0.375rem",
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {debouncedProductSearch.length <= 1 && (
                        <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                          Frequent & Recommended Products
                        </div>
                      )}

                      {(debouncedProductSearch.length > 1 ? productResults?.data : frequentProducts?.data)?.length ? (
                        (debouncedProductSearch.length > 1 ? productResults?.data : frequentProducts?.data).map((product: any) => (
                          <div
                            key={product.id}
                            style={{
                              padding: "0.625rem 0.875rem",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border-color)",
                              transition: "background 0.15s",
                            }}
                            className="hover:bg-[var(--bg-tertiary)]"
                            onClick={() => addProduct(product)}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{product.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                SKU: {product.sku} • {product.category?.name || "Garment"}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: 700, color: "var(--brand-600)", fontSize: "0.875rem" }}>
                                {formatCurrency(isRetailCustomer ? (product.retailPrice ?? product.wholesalePrice) : product.wholesalePrice)}
                              </div>
                              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                                {isRetailCustomer ? "Retail" : "Wholesale"} • GST {product.gstPercent}%
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "1.25rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                          No products found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Notes & Remarks</span>
              </div>
              <div className="card-body">
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Enter order notes or customer instructions..."
                  {...register("notes")}
                />
              </div>
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="flex flex-col gap-6">
            <div className="card" style={{ position: "sticky", top: "1.5rem" }}>
              <div className="card-header" style={{ background: "var(--bg-tertiary)" }}>
                <span style={{ fontWeight: 700 }}>Summary ({docType})</span>
              </div>
              <div className="card-body flex flex-col gap-4">
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>GST Tax Total</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(taxAmount)}</span>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Discount Amount (₹)</label>
                  <input
                    type="number"
                    step="1"
                    className="form-input"
                    {...register("discountAmount", { valueAsNumber: true })}
                  />
                </div>

                <div style={{ borderTop: "2px dashed var(--border-color)", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>Grand Total</span>
                  <span style={{ fontWeight: 800, fontSize: "1.375rem", color: "var(--brand-600)" }}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                {docType === "INVOICE" && (
                  <>
                    <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                      <label className="form-label">Payment Method</label>
                      <select className="form-select" {...register("paymentMethod")}>
                        <option value="UPI">UPI / PhonePe / GPay</option>
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>

                    <div className="form-group mb-0">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Amount Paid Received (₹)</label>
                        <div style={{ display: "flex", gap: "0.375rem" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "0.125rem 0.5rem" }}
                            onClick={() => setValue("paidAmount", totalAmount)}
                          >
                            Full ({formatCurrency(totalAmount)})
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            style={{ fontSize: "0.6875rem", padding: "0.125rem 0.375rem" }}
                            onClick={() => setValue("paidAmount", 0)}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="1"
                        className="form-input"
                        style={{ fontWeight: 700, fontSize: "1.125rem" }}
                        {...register("paidAmount", { valueAsNumber: true })}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Balance Due</span>
                      <span style={{ fontWeight: 700, color: dueAmount > 0 ? "#dc2626" : "#059669" }}>
                        {formatCurrency(dueAmount)}
                      </span>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-full justify-center mt-2"
                  style={{ padding: "0.75rem", fontWeight: 700, fontSize: "0.9375rem" }}
                  disabled={mutation.isPending || fields.length === 0}
                >
                  {mutation.isPending ? (
                    "Processing..."
                  ) : docType === "QUOTE" ? (
                    "Generate Quotation"
                  ) : (
                    "Issue Tax Invoice"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Customer Modal */}
      {showQuickCustomerModal && (
        <QuickCustomerModal
          open={showQuickCustomerModal}
          onOpenChange={setShowQuickCustomerModal}
          onSuccess={(newCustomer) => {
            setValue("customerId", newCustomer.id);
            setShowQuickCustomerModal(false);
          }}
        />
      )}
    </div>
  );
}

export default function NewSalePage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading Sale Form...</div>}>
      <NewSaleContent />
    </Suspense>
  );
}
