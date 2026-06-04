"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";

interface CustomerForm {
  shopName: string;
  ownerName: string;
  whatsapp: string;
  email: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  creditLimit: number;
  paymentTerms: string;
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["customer-edit", id],
    queryFn: async () => (await api.get(`/customers/${id}`)).data,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CustomerForm>({
    defaultValues: { state: "Tamil Nadu", creditLimit: 0, paymentTerms: "30 days" },
  });

  useEffect(() => {
    if (customer) {
      setValue("shopName", customer.shopName);
      setValue("ownerName", customer.ownerName);
      setValue("whatsapp", customer.whatsapp);
      setValue("email", customer.email || "");
      setValue("gstNumber", customer.gstNumber || "");
      setValue("address", customer.address || "");
      setValue("city", customer.city || "");
      setValue("state", customer.state || "Tamil Nadu");
      setValue("pincode", customer.pincode || "");
      setValue("creditLimit", customer.creditLimit);
      setValue("paymentTerms", customer.paymentTerms || "30 days");
    }
  }, [customer, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: CustomerForm) =>
      (await api.put(`/customers/${id}`, { ...data, creditLimit: Number(data.creditLimit) })).data,
    onSuccess: () => {
      toast.success("Customer updated successfully!");
      router.push(`/customers/${id}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error || "Failed to update customer"),
  });

  if (isLoadingCustomer) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="skeleton" style={{ width: "200px", height: "1.5rem", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ width: "100%", height: "250px" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href={`/customers/${id}`} className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Edit Customer</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Modify customer profile and credit limit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="card-header"><span style={{ fontWeight: 600 }}>Shop Information</span></div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Shop Name *</label>
              <input className={`form-input ${errors.shopName ? "error" : ""}`} placeholder="e.g. Murugan Dress House"
                {...register("shopName", { required: "Shop name is required" })} />
              {errors.shopName && <span className="form-error">{errors.shopName.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Owner Name *</label>
              <input className={`form-input ${errors.ownerName ? "error" : ""}`} placeholder="Owner full name"
                {...register("ownerName", { required: "Owner name is required" })} />
              {errors.ownerName && <span className="form-error">{errors.ownerName.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Number *</label>
              <input className={`form-input ${errors.whatsapp ? "error" : ""}`} placeholder="9876543210"
                {...register("whatsapp", { required: "WhatsApp number is required" })} />
              {errors.whatsapp && <span className="form-error">{errors.whatsapp.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="shop@example.com" {...register("email")} />
            </div>
            <div className="form-group">
              <label className="form-label">GST Number</label>
              <input className="form-input" placeholder="33ABCDE1234F1Z5" {...register("gstNumber")} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card" style={{ marginTop: "1rem" }}>
          <div className="card-header"><span style={{ fontWeight: 600 }}>Address</span></div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Address</label>
              <textarea className="form-input" rows={2} placeholder="Street address" {...register("address")} style={{ resize: "vertical" }} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" placeholder="e.g. Erode" {...register("city")} />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="form-input" {...register("state")} />
            </div>
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input className="form-input" placeholder="641601" {...register("pincode")} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card" style={{ marginTop: "1rem" }}>
          <div className="card-header"><span style={{ fontWeight: 600 }}>Credit & Payment</span></div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Credit Limit (₹)</label>
              <input type="number" min="0" className="form-input" placeholder="0" {...register("creditLimit")} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Terms</label>
              <select className="form-input form-select" {...register("paymentTerms")}>
                <option value="Cash on delivery">Cash on delivery</option>
                <option value="7 days">7 days</option>
                <option value="15 days">15 days</option>
                <option value="30 days">30 days</option>
                <option value="45 days">45 days</option>
                <option value="60 days">60 days</option>
              </select>
            </div>
          </div>
        </motion.div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
          <Link href={`/customers/${id}`} className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
