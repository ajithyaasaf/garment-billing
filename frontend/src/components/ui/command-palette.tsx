"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, Users, Receipt, FileText, X, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface SearchResults {
  products: { id: string; name: string; sku: string; wholesalePrice: number; category: { name: string } }[];
  customers: { id: string; shopName: string; ownerName: string; whatsapp: string; city: string }[];
  quotations: { id: string; quotationNumber: string; totalAmount: number; status: string; customer: { shopName: string } }[];
  invoices: { id: string; invoiceNumber: string; totalAmount: number; paymentStatus: string; customer: { shopName: string } }[];
}

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"all" | "products" | "customers" | "invoices" | "quotations">("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${query}&type=${activeSection}`);
        setResults(res.data);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeSection]);

  const hasResults = results && (
    results.products?.length > 0 ||
    results.customers?.length > 0 ||
    results.invoices?.length > 0 ||
    results.quotations?.length > 0
  );

  const sections = [
    { key: "all", label: "All" },
    { key: "products", label: "Products" },
    { key: "customers", label: "Customers" },
    { key: "invoices", label: "Invoices" },
    { key: "quotations", label: "Quotations" },
  ] as const;

  return (
    <div className="search-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="search-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "70vh", display: "flex", flexDirection: "column" }}
      >
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <Search size={18} color="var(--text-tertiary)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, customers, invoices..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: "1rem",
              color: "var(--text-primary)",
              fontFamily: "inherit",
            }}
          />
          {loading && (
            <div style={{ width: "1rem", height: "1rem", borderRadius: "50%", border: "2px solid var(--border-color)", borderTopColor: "var(--brand-600)", animation: "spin 0.8s linear infinite" }} />
          )}
          <button
            onClick={onClose}
            style={{ padding: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Section Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            padding: "0.5rem",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              style={{
                padding: "0.25rem 0.625rem",
                borderRadius: "0.375rem",
                border: "none",
                background: activeSection === s.key ? "var(--brand-100)" : "transparent",
                color: activeSection === s.key ? "var(--brand-700)" : "var(--text-secondary)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {!query && (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
              <Search size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.3 }} />
              <p>Type to search across your data</p>
              <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Products, customers, invoices, quotations</p>
            </div>
          )}

          {query && !hasResults && !loading && (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
              No results for "{query}"
            </div>
          )}

          {results && (
            <div>
              {/* Products */}
              {results.products?.length > 0 && (
                <ResultSection title="Products" icon={Package} color="#10b981">
                  {results.products.map((p) => (
                    <Link
                      key={p.id}
                      href={`/inventory/${p.id}`}
                      onClick={onClose}
                      className="result-item"
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{p.sku} · {p.category.name}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 700, color: "var(--brand-600)", fontSize: "0.875rem" }}>{formatCurrency(p.wholesalePrice)}</span>
                        <ArrowRight size={14} color="var(--text-tertiary)" />
                      </div>
                    </Link>
                  ))}
                </ResultSection>
              )}

              {/* Customers */}
              {results.customers?.length > 0 && (
                <ResultSection title="Customers" icon={Users} color="#6366f1">
                  {results.customers.map((c) => (
                    <Link key={c.id} href={`/customers/${c.id}`} onClick={onClose} className="result-item">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{c.shopName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{c.ownerName} · {c.city}</div>
                      </div>
                      <ArrowRight size={14} color="var(--text-tertiary)" />
                    </Link>
                  ))}
                </ResultSection>
              )}

              {/* Invoices */}
              {results.invoices?.length > 0 && (
                <ResultSection title="Invoices" icon={Receipt} color="#3b82f6">
                  {results.invoices.map((inv) => (
                    <Link key={inv.id} href={`/invoices/${inv.id}`} onClick={onClose} className="result-item">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{inv.invoiceNumber}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{inv.customer.shopName}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{formatCurrency(inv.totalAmount)}</span>
                        <ArrowRight size={14} color="var(--text-tertiary)" />
                      </div>
                    </Link>
                  ))}
                </ResultSection>
              )}

              {/* Quotations */}
              {results.quotations?.length > 0 && (
                <ResultSection title="Quotations" icon={FileText} color="#f59e0b">
                  {results.quotations.map((q) => (
                    <Link key={q.id} href={`/quotations/${q.id}`} onClick={onClose} className="result-item">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{q.quotationNumber}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{q.customer.shopName}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{formatCurrency(q.totalAmount)}</span>
                        <ArrowRight size={14} color="var(--text-tertiary)" />
                      </div>
                    </Link>
                  ))}
                </ResultSection>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.625rem 1rem",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            gap: "1rem",
          }}
        >
          {[{ key: "ESC", label: "Close" }, { key: "↑↓", label: "Navigate" }, { key: "↵", label: "Open" }].map((hint) => (
            <span key={hint.key} style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
              <kbd style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "0.25rem", padding: "0.0625rem 0.375rem" }}>
                {hint.key}
              </kbd>
              {hint.label}
            </span>
          ))}
        </div>
      </motion.div>

      <style>{`
        .result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 1rem;
          text-decoration: none;
          color: var(--text-primary);
          transition: background 0.1s;
          cursor: pointer;
        }
        .result-item:hover {
          background: var(--bg-tertiary);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ResultSection({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <Icon size={13} color={color} />
        <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
