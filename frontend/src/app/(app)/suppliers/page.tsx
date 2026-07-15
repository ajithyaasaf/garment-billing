"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Phone, MapPin, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { debounce, generateWhatsAppLink, formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Supplier {
  id: string;
  shopName: string;
  ownerName: string;
  whatsapp: string;
  city: string;
  state: string;
  gstNumber?: string;
  isActive: boolean;
  _count: { purchaseBills: number };
}

export default function SuppliersPage() {
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
    queryKey: ["suppliers", debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: debouncedSearch,
      });
      const res = await api.get(`/suppliers?${params}`);
      return res.data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success("Supplier deleted successfully");
      refetch();
    } catch {
      toast.error("Failed to delete supplier");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em" }}>Suppliers</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {data?.meta?.total || 0} active suppliers
          </p>
        </div>
        <Link href="/suppliers/new" className="btn btn-primary btn-sm w-full sm:w-auto">
          <Plus size={15} />
          Add Supplier
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
          placeholder="Search supplier shop, owner, phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            debouncedSetSearch(e.target.value);
          }}
        />
      </div>

      {/* Supplier Cards */}
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
          {data.data.map((supplier: Supplier, i: number) => (
            <motion.div
              key={supplier.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card"
            >
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      className="text-[var(--text-primary)] hover:text-blue-600 hover:underline transition-colors"
                      style={{
                        fontWeight: 700,
                        fontSize: "0.9375rem",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {supplier.shopName}
                    </Link>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{supplier.ownerName}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {supplier.whatsapp && (
                    <a
                      href={generateWhatsAppLink(supplier.whatsapp, `Hello ${supplier.ownerName},`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--brand-600)" }}
                      className="hover:underline"
                    >
                      <Phone size={13} />
                      {supplier.whatsapp}
                    </a>
                  )}
                  {(supplier.city || supplier.state) && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      <MapPin size={13} />
                      {supplier.city ? `${supplier.city}, ${supplier.state}` : supplier.state}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>Purchase Bills</div>
                    <div style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                      {supplier._count.purchaseBills} bills
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      className="btn btn-ghost btn-sm btn-icon"
                      title="View Ledger"
                    >
                      <Eye size={14} />
                    </Link>
                    <Link
                      href={`/suppliers/${supplier.id}/edit`}
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="btn btn-ghost btn-sm btn-icon"
                      style={{ color: "var(--danger)" }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>No suppliers found.</p>
          <Link href="/suppliers/new" className="btn btn-primary btn-sm">
            Add Supplier
          </Link>
        </div>
      )}
    </div>
  );
}
