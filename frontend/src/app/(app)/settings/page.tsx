"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Building2, Users, Settings as SettingsIcon, Save, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store";
import { getStateFromGst } from "@/lib/gst";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"business" | "staff" | "invoice">("business");
  const [showAddStaff, setShowAddStaff] = useState(false);
  const qc = useQueryClient();

  const { data: business } = useQuery({
    queryKey: ["business-profile"],
    queryFn: async () => (await api.get("/settings/business")).data,
  });

  const { data: staffList } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => (await api.get("/settings/staff")).data,
    enabled: user?.role === "ADMIN",
  });

  const businessForm = useForm({ defaultValues: business });
  const staffForm = useForm();

  useEffect(() => {
    if (business) {
      businessForm.reset(business);
    }
  }, [business, businessForm]);

  const businessGstNumber = businessForm.watch("gstNumber");

  useEffect(() => {
    if (businessGstNumber) {
      const derivedState = getStateFromGst(businessGstNumber);
      if (derivedState) {
        businessForm.setValue("state", derivedState);
      }
    }
  }, [businessGstNumber, businessForm]);

  const businessMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => (await api.put("/settings/business", data)).data,
    onSuccess: () => { toast.success("Business profile saved!"); qc.invalidateQueries({ queryKey: ["business-profile"] }); },
    onError: () => toast.error("Save failed"),
  });

  const staffMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => (await api.post("/settings/staff", data)).data,
    onSuccess: () => { toast.success("Staff member added!"); setShowAddStaff(false); staffForm.reset(); qc.invalidateQueries({ queryKey: ["staff-list"] }); },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || "Failed to add staff"),
  });

  const deactivateStaff = async (id: string) => {
    if (!confirm("Deactivate this staff member?")) return;
    await api.delete(`/settings/staff/${id}`);
    toast.success("Staff deactivated");
    qc.invalidateQueries({ queryKey: ["staff-list"] });
  };

  const tabs = [
    { key: "business", label: "Business Profile", icon: Building2 },
    { key: "staff", label: "Staff Management", icon: Users },
  ] as const;

  return (
    <div style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Manage your business and application settings</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.625rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--brand-600)" : "2px solid transparent",
              color: activeTab === tab.key ? "var(--brand-600)" : "var(--text-secondary)",
              fontWeight: activeTab === tab.key ? 600 : 500,
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "all 0.15s",
              marginBottom: "-1px",
            }}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "business" && business && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={businessForm.handleSubmit((data) => businessMutation.mutate(data as Record<string, unknown>))}>
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 600 }}>Business Information</span></div>
              <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Business Name *</label>
                  <input className="form-input" {...businessForm.register("name", { required: true })} defaultValue={business.name} />
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Address</label>
                  <textarea className="form-input" rows={2} {...businessForm.register("address")} defaultValue={business.address} style={{ resize: "vertical" }} />
                </div>
                {[
                  { key: "city", label: "City" },
                  { key: "state", label: "State" },
                  { key: "pincode", label: "Pincode" },
                  { key: "phone", label: "Phone" },
                  { key: "email", label: "Email" },
                  { key: "gstNumber", label: "GST Number" },
                ].map((field) => (
                  <div key={field.key} className="form-group">
                    <label className="form-label">{field.label}</label>
                    <input className="form-input" {...businessForm.register(field.key as any)} defaultValue={business[field.key as keyof typeof business] as string} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: "1rem" }}>
              <div className="card-header"><span style={{ fontWeight: 600 }}>Bank Details</span></div>
              <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {[
                  { key: "bankName", label: "Bank Name" },
                  { key: "bankAccount", label: "Account Number" },
                  { key: "bankIfsc", label: "IFSC Code" },
                  { key: "upiId", label: "UPI ID" },
                ].map((field) => (
                  <div key={field.key} className="form-group">
                    <label className="form-label">{field.label}</label>
                    <input className="form-input" {...businessForm.register(field.key as any)} defaultValue={business[field.key as keyof typeof business] as string} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: "1rem" }}>
              <div className="card-header"><span style={{ fontWeight: 600 }}>Invoice Settings</span></div>
              <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {[
                  { key: "invoicePrefix", label: "Invoice Prefix" },
                  { key: "quotationPrefix", label: "Quotation Prefix" },
                ].map((field) => (
                  <div key={field.key} className="form-group">
                    <label className="form-label">{field.label}</label>
                    <input className="form-input" {...businessForm.register(field.key as any)} defaultValue={business[field.key as keyof typeof business] as string} />
                  </div>
                ))}
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Invoice Notes</label>
                  <textarea className="form-input" rows={3} {...businessForm.register("invoiceNotes")} defaultValue={business.invoiceNotes} style={{ resize: "vertical" }} />
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Terms & Conditions</label>
                  <textarea className="form-input" rows={4} {...businessForm.register("termsConditions")} defaultValue={business.termsConditions} style={{ resize: "vertical" }} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="submit" className="btn btn-primary" disabled={businessMutation.isPending}>
                {businessMutation.isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
                <Save size={15} />
                Save Settings
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {activeTab === "staff" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddStaff(!showAddStaff)}>
              <Plus size={14} />
              Add Staff
            </button>
          </div>

          {showAddStaff && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ marginBottom: "1.25rem" }}>
              <div className="card-header"><span style={{ fontWeight: 600 }}>Add New Staff Member</span></div>
              <div className="card-body">
                <form onSubmit={staffForm.handleSubmit((data) => staffMutation.mutate(data as Record<string, unknown>))}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    {[
                      { key: "name", label: "Full Name", required: true },
                      { key: "email", label: "Email", required: true, type: "email" },
                      { key: "password", label: "Password", required: true, type: "password" },
                      { key: "phone", label: "Phone" },
                    ].map((field) => (
                      <div key={field.key} className="form-group">
                        <label className="form-label">{field.label} {field.required && "*"}</label>
                        <input type={field.type || "text"} className="form-input" {...staffForm.register(field.key, { required: field.required })} />
                      </div>
                    ))}
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="form-input form-select" {...staffForm.register("role")}>
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddStaff(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={staffMutation.isPending}>
                      {staffMutation.isPending ? "Adding..." : "Add Staff"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList?.map((staff: { id: string; name: string; email: string; phone?: string; role: string; isActive: boolean }) => (
                  <tr key={staff.id}>
                    <td style={{ fontWeight: 600 }}>{staff.name}</td>
                    <td>{staff.email}</td>
                    <td>{staff.phone || "–"}</td>
                    <td><span className={`badge ${staff.role === "ADMIN" ? "badge-purple" : "badge-info"}`}>{staff.role}</span></td>
                    <td><span className={`badge ${staff.isActive ? "badge-success" : "badge-danger"}`}>{staff.isActive ? "Active" : "Inactive"}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: "var(--danger)" }} onClick={() => deactivateStaff(staff.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
