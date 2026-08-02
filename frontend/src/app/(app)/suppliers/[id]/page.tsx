"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, MapPin, Phone, Mail, Award, Eye, FileText, ArrowUpRight, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import api from "@/lib/api";

interface PurchaseBill {
  id: string;
  billNumber: string;
  totalAmount: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  billDate: string;
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => (await api.get(`/suppliers/${id}`)).data,
    enabled: !!id && id !== "undefined",
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case "PAID":
        return "badge-success";
      case "PARTIAL":
        return "badge-warning";
      case "UNPAID":
        return "badge-danger";
      default:
        return "badge-secondary";
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "5rem",
        }}
      >
        <div className="skeleton" style={{ height: "40px", width: "40px", borderRadius: "50%" }} />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Supplier not found</p>
        <Link href="/suppliers" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
          Back to Suppliers
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/suppliers" className="btn btn-ghost btn-sm btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 700 }}>Supplier Profile</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Manage vendor catalog and payments</p>
          </div>
        </div>
        <Link href={`/suppliers/${id}/edit`} className="btn btn-secondary btn-sm">
          <Edit size={14} />
          Edit Profile
        </Link>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left Column: Vendor Details */}
        <div className="card lg:col-span-1">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Vendor Details</span>
          </div>
          <div className="card-body">
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              {supplier.shopName}
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Contact: {supplier.ownerName}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1rem 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                <Phone size={15} color="var(--text-tertiary)" />
                <a href={`https://wa.me/91${supplier.whatsapp}`} target="_blank" rel="noreferrer" className="text-[var(--brand-600)] hover:underline">
                  {supplier.whatsapp}
                </a>
              </div>
              {supplier.email && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <Mail size={15} color="var(--text-tertiary)" />
                  <span style={{ color: "var(--text-secondary)" }}>{supplier.email}</span>
                </div>
              )}
              {supplier.gstNumber && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <Award size={15} color="var(--text-tertiary)" />
                  <span style={{ color: "var(--text-secondary)" }}>GST: {supplier.gstNumber}</span>
                </div>
              )}
              {(supplier.address || supplier.city) && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <MapPin size={15} color="var(--text-tertiary)" style={{ marginTop: "2px" }} />
                  <span style={{ color: "var(--text-secondary)" }}>
                    {[supplier.address, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Outstanding Balance Widget */}
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                borderRadius: "0.625rem",
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid rgba(239, 68, 68, 0.1)",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                OUTSTANDING DUE TO VENDOR
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)", marginTop: "0.25rem" }}>
                {formatCurrency(supplier.outstandingBalance || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ledger / Purchase Invoices */}
        <div className="card lg:col-span-2">
          <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600 }}>Purchase Bills Ledger</span>
            <Link href={`/purchases/new?supplierId=${supplier.id}`} className="btn btn-primary btn-sm">
              <Plus size={14} /> New Purchase Bill
            </Link>
          </div>
          <div className="card-body">
            {supplier.purchaseBills && supplier.purchaseBills.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bill Number</th>
                      <th>Bill Date</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplier.purchaseBills.map((bill: PurchaseBill) => (
                      <tr key={bill.id}>
                        <td style={{ fontWeight: 600 }}>{bill.billNumber}</td>
                        <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                          {new Date(bill.billDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(bill.totalAmount)}</td>
                        <td>
                          <span className={`badge ${getStatusClass(bill.paymentStatus)}`}>
                            {bill.paymentStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/purchases/${bill.id}`} className="btn btn-ghost btn-sm btn-icon" title="View Bill Details">
                            <Eye size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <FileText size={32} color="var(--text-tertiary)" style={{ margin: "0 auto 0.75rem" }} />
                <p>No purchase bills recorded for this supplier.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
