"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Phone, MapPin, Edit, Trash2, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { debounce, generateWhatsAppLink, formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Customer {
  id: string;
  shopName: string;
  ownerName: string;
  whatsapp: string;
  city: string;
  state: string;
  gstNumber?: string;
  creditLimit: number;
  isActive: boolean;
  _count: { invoices: number; quotations: number };
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSetSearch = useCallback(
    debounce((val: string) => {
      setDebouncedSearch(val as string);
      setPage(1);
    }, 300),
    []
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customers", debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: debouncedSearch,
      });
      const res = await api.get(`/customers?${params}`);
      return res.data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success("Customer deleted");
      refetch();
    } catch {
      toast.error("Failed to delete customer");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>Customers</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {data?.meta?.total || 0} active customers
          </p>
        </div>
        <Link href="/customers/new" className="btn btn-primary btn-sm w-full sm:w-auto">
          <Plus size={15} />
          Add Customer
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5 w-full max-w-[400px]">
        <Search
          size={15}
          color="var(--text-tertiary)"
          style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          className="form-input w-full"
          style={{ paddingLeft: "2.25rem" }}
          placeholder="Search shop name, owner, phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            debouncedSetSearch(e.target.value);
          }}
        />
      </div>

      {/* Customer Cards */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {Array(8).fill(null).map((_, i) => (
            <div key={i} className="card" style={{ padding: "1.25rem" }}>
              <div className="skeleton" style={{ height: "1.25rem", width: "60%", marginBottom: "0.75rem" }} />
              <div className="skeleton" style={{ height: "0.875rem", width: "80%", marginBottom: "0.5rem" }} />
              <div className="skeleton" style={{ height: "0.875rem", width: "50%" }} />
            </div>
          ))}
        </div>
      ) : data?.data?.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {data.data.map((customer: Customer, i: number) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card"
            >
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="text-[var(--text-primary)] hover:text-blue-600 hover:underline transition-colors"
                      style={{
                        fontWeight: 700,
                        fontSize: "0.9375rem",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {customer.shopName}
                    </Link>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {customer.ownerName}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <Link href={`/customers/${customer.id}`} className="btn btn-ghost btn-sm btn-icon" title="View Profile">
                      <Eye size={14} />
                    </Link>
                    <Link href={`/customers/${customer.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                      <Edit size={14} />
                    </Link>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      style={{ color: "var(--danger)" }}
                      onClick={() => handleDelete(customer.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginBottom: "0.875rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    <Phone size={13} />
                    <a
                      href={generateWhatsAppLink(customer.whatsapp, `Hello ${customer.ownerName}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--brand-600)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      {customer.whatsapp}
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    <MapPin size={13} />
                    {customer.city}, {customer.state}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    background: "var(--bg-tertiary)",
                    borderRadius: "0.5rem",
                    marginBottom: "0.875rem",
                  }}
                >
                  {[
                    { label: "Invoices", value: customer._count.invoices },
                    { label: "Quotations", value: customer._count.quotations },
                    { label: "Credit Limit", value: formatCurrency(customer.creditLimit) },
                  ].map((stat) => (
                    <div key={stat.label} style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{stat.value}</div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Link href={`/invoices/new?customerId=${customer.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                    New Invoice
                  </Link>
                  <Link href={`/quotations/new?customerId=${customer.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                    New Quote
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="empty-state card" style={{ padding: "3rem" }}>
          <p style={{ fontWeight: 600 }}>No customers found</p>
          <Link href="/customers/new" className="btn btn-primary btn-sm" style={{ marginTop: "0.75rem" }}>
            <Plus size={14} /> Add First Customer
          </Link>
        </div>
      )}

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
            {page} / {data.meta.totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page === data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
