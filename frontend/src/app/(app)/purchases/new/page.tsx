"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Plus, Trash2, ArrowLeft, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency, debounce } from "@/lib/utils";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";
import * as Dialog from "@radix-ui/react-dialog";

interface PurchaseItemForm {
  productId: string;
  variantId: string;
  productName: string;
  color: string;
  size: string;
  sku: string;
  quantity: number;
  unitPrice: number; // cost/purchase price
  gstPercent: number;
  variants?: { id: string; color: string; size: string; stock: number }[];
}

interface PurchaseForm {
  supplierId: string;
  billNumber: string;
  billDate: string;
  notes: string;
  discountAmount: number;
  paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT";
  paidAmount: number;
  dueDate: string;
  items: PurchaseItemForm[];
}

export default function NewPurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSupplierId = searchParams.get("supplierId") || "";

  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedProductSearch(val as string), 300), []
  );

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => (await api.get("/suppliers?limit=100")).data,
  });

  const { data: productResults } = useQuery({
    queryKey: ["product-search-purchase", debouncedProductSearch],
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
  } = useForm<PurchaseForm>({
    defaultValues: {
      supplierId: preselectedSupplierId,
      billDate: new Date().toISOString().split("T")[0],
      discountAmount: 0,
      paidAmount: 0,
      paymentMethod: "CASH",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchItems = watch("items");
  const watchDiscount = watch("discountAmount") || 0;
  const watchPaid = watch("paidAmount") || 0;

  // Calculate totals
  let subtotal = 0;
  let taxAmount = 0;

  watchItems?.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const gstPercent = Number(item.gstPercent) || 0;

    const base = qty * price;
    const gst = base * (gstPercent / 100);

    subtotal += base;
    taxAmount += gst;
  });

  const totalAmount = subtotal + taxAmount - Number(watchDiscount);
  const dueAmount = Math.max(0, totalAmount - Number(watchPaid));

  const mutation = useMutation({
    mutationFn: async (data: PurchaseForm) => {
      const res = await api.post("/purchases", {
        ...data,
        discountAmount: Number(data.discountAmount),
        paidAmount: Number(data.paidAmount),
        items: data.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          gstPercent: Number(item.gstPercent),
        })),
      });
      return res.data;
    },
    onSuccess: (purchase) => {
      toast.success("Purchase bill logged successfully!");
      router.push(`/purchases/${purchase.id}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || "Failed to save purchase bill");
    },
  });

  const addProduct = (product: {
    id: string;
    name: string;
    sku: string;
    purchasePrice: number;
    gstPercent: number;
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
      unitPrice: product.purchasePrice || 0,
      gstPercent: product.gstPercent,
      variants: product.variants,
    });
    setProductSearch("");
    setShowProductSearch(false);
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/purchases" className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Record Purchase Bill</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Log stock purchasing invoice from a vendor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div className="new-transaction-layout" style={{ display: "grid", gap: "1.25rem", alignItems: "start" }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
            
            {/* Supplier Details */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Supplier Details</span>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Select Supplier *</label>
                      <button
                        type="button"
                        style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--brand-600)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        onClick={() => setShowQuickSupplierModal(true)}
                      >
                        <Plus size={12} /> Quick Add
                      </button>
                    </div>
                    <Controller
                      control={control}
                      name="supplierId"
                      rules={{ required: "Supplier is required" }}
                      render={({ field }) => (
                        <SearchableSelect
                          options={
                            suppliers?.data?.map((s: { id: string; shopName: string; ownerName: string }) => ({
                              value: s.id,
                              label: s.shopName,
                              sublabel: s.ownerName,
                            })) || []
                          }
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select supplier..."
                          searchPlaceholder="Search supplier by shop or owner name..."
                          error={!!errors.supplierId}
                        />
                      )}
                    />
                    {errors.supplierId && <span className="form-error">{errors.supplierId.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Vendor Bill / Invoice Number *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. BILL-4920"
                      {...register("billNumber", { required: "Bill number is required" })}
                    />
                    {errors.billNumber && <span className="form-error">{errors.billNumber.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bill Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      {...register("billDate", { required: "Bill date is required" })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sourced Items */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Purchase Items</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowProductSearch(true)}
                >
                  <Plus size={14} /> Add Product
                </button>
              </div>
              <div className="card-body">
                {/* Search overlay */}
                {showProductSearch && (
                  <div style={{ position: "relative", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Search size={15} color="var(--text-tertiary)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          className="form-input"
                          style={{ paddingLeft: "2.25rem" }}
                          placeholder="Search product by name or SKU..."
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
                        {productResults.data.map((product: any) => (
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
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{product.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                {product.sku} · {product.category?.name}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: 700, color: "var(--brand-600)" }}>
                                Cost: {formatCurrency(product.purchasePrice || 0)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Items list */}
                {fields.length > 0 ? (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Variant</th>
                          <th>Qty</th>
                          <th>Cost Price (₹)</th>
                          <th>GST %</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => {
                          const item = watchItems[index];
                          const lineBase = (item?.quantity || 0) * (item?.unitPrice || 0);
                          const lineTotal = lineBase + lineBase * ((item?.gstPercent || 0) / 100);

                          return (
                            <tr key={field.id}>
                              <td style={{ fontWeight: 500, minWidth: "140px" }}>{field.productName}</td>
                              <td>
                                {field.variants && field.variants.length > 0 ? (
                                  <select
                                    className="form-input form-select"
                                    style={{ width: "130px", fontSize: "0.75rem", padding: "2px 6px", height: "auto" }}
                                    {...register(`items.${index}.variantId`, {
                                      onChange: (e) => {
                                        const selected = field.variants?.find((v) => v.id === e.target.value);
                                        if (selected) {
                                          setValue(`items.${index}.color`, selected.color);
                                          setValue(`items.${index}.size`, selected.size);
                                        }
                                      },
                                    })}
                                  >
                                    {field.variants.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.color} / {v.size} ({v.stock} left)
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                    {field.color || "—"} / {field.size || "—"}
                                  </span>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  className="form-input"
                                  style={{ width: "70px" }}
                                  {...register(`items.${index}.quantity`, { min: 1, valueAsNumber: true })}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-input"
                                  style={{ width: "95px" }}
                                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                                />
                              </td>
                              <td>
                                <select
                                  className="form-input form-select"
                                  style={{ width: "70px" }}
                                  {...register(`items.${index}.gstPercent`, { valueAsNumber: true })}
                                >
                                  {[0, 5, 12, 18, 28].map((g) => (
                                    <option key={g} value={g}>{g}%</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ fontWeight: 600 }}>{formatCurrency(lineTotal)}</td>
                              <td>
                                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(index)} style={{ color: "var(--danger)" }}>
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
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    No items added. Click "Add Product" above to catalog sourced products.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 600 }}>Summary & Payment</span></div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Total GST Tax</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(taxAmount)}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    {...register("discountAmount", { valueAsNumber: true })}
                  />
                </div>

                <div style={{ height: "1px", background: "var(--border-color)" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Total Purchase Cost</span>
                  <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--brand-600)" }}>{formatCurrency(totalAmount)}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-input form-select" {...register("paymentMethod")}>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / Netbanking</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CREDIT">Supplier Credit (Ledger)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    {...register("paidAmount", { valueAsNumber: true })}
                  />
                </div>

                <div style={{ height: "1px", background: "var(--border-color)" }} />

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>Due to Supplier</span>
                  <span style={{ fontWeight: 800, color: dueAmount > 0 ? "var(--danger)" : "var(--success)" }}>{formatCurrency(dueAmount)}</span>
                </div>

                {dueAmount > 0 && (
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-input" {...register("dueDate")} />
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  disabled={mutation.isPending || fields.length === 0}
                >
                  {mutation.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
                  {mutation.isPending ? "Saving..." : "Save Purchase Bill"}
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 600 }}>Notes / Remarks</span></div>
              <div className="card-body">
                <textarea className="form-input" rows={3} placeholder="Add purchase notes..." {...register("notes")} />
              </div>
            </div>

          </div>
        </div>
      </form>

      {/* Quick Add Supplier Modal */}
      <QuickSupplierModal
        open={showQuickSupplierModal}
        onOpenChange={setShowQuickSupplierModal}
        onSuccess={(supplier) => {
          setValue("supplierId", supplier.id);
        }}
      />

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
    </div>
  );
}

// Inline Quick Supplier Modal Component
function QuickSupplierModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (supplier: { id: string; shopName: string }) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { shopName: "", ownerName: "", whatsapp: "", city: "", state: "Tamil Nadu" },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return (await api.post("/suppliers", data)).data;
    },
    onSuccess: (data) => {
      toast.success("Supplier added successfully!");
      onSuccess(data);
      onOpenChange(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to add supplier");
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 50 }} />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            width: "90%",
            maxWidth: "500px",
            boxShadow: "var(--shadow-xl)",
            zIndex: 51,
          }}
        >
          <Dialog.Title style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            Quick Add Supplier
          </Dialog.Title>
          <Dialog.Description style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Add a new sourcing partner inline without leaving this purchase bill.
          </Dialog.Description>

          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Shop Name *</label>
              <input className="form-input" placeholder="e.g. Balaji Textiles" {...register("shopName", { required: "Shop name is required" })} />
              {errors.shopName && <span className="form-error">{errors.shopName.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Owner Name *</label>
              <input className="form-input" placeholder="e.g. Rajesh Kumar" {...register("ownerName", { required: "Owner name is required" })} />
              {errors.ownerName && <span className="form-error">{errors.ownerName.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp Number *</label>
              <input className="form-input" placeholder="10 digit number" {...register("whatsapp", { required: "WhatsApp number is required", pattern: { value: /^[0-9]{10}$/, message: "Must be a 10 digit number" } })} />
              {errors.whatsapp && <span className="form-error">{errors.whatsapp.message}</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" placeholder="e.g. Tiruppur" {...register("city")} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" placeholder="Tamil Nadu" {...register("state")} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <Dialog.Close asChild>
                <button type="button" className="btn btn-secondary btn-sm">Cancel</button>
              </Dialog.Close>
              <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 size={12} style={{ animation: "spin 1s linear infinite", marginRight: "0.25rem" }} />}
                Save Supplier
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
