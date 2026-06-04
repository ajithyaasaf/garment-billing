"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package2,
  Users,
  FileText,
  Receipt,
  ShoppingBag,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Package,
  Search,
} from "lucide-react";
import { useAuthStore, useUIStore } from "@/store";
import { toast } from "sonner";
import { CommandPalette } from "@/components/ui/command-palette";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: FileText, label: "Quotations", href: "/quotations" },
  { icon: Receipt, label: "Invoices", href: "/invoices" },
  { icon: ShoppingBag, label: "Orders", href: "/orders" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
];

const adminNavItems = [
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, commandOpen, setCommandOpen } = useUIStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCommandOpen, setSidebarOpen]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.replace("/login");
  };

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <div className="app-shell">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={overlayRef}
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 39,
              backdropFilter: "blur(2px)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        {/* Logo */}
        <div
          style={{
            padding: "1.125rem 1rem",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Package2 size={16} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>
              GarmentOS
            </div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
              Wholesale ERP
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              marginLeft: "auto",
              padding: "0.25rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "none",
            }}
            className="mobile-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Trigger */}
        <div style={{ padding: "0.75rem" }}>
          <button
            onClick={() => setCommandOpen(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "0.5rem",
              color: "var(--text-tertiary)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <Search size={14} />
            <span style={{ flex: 1, textAlign: "left" }}>Search...</span>
            <kbd
              style={{
                fontSize: "0.625rem",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "0.25rem",
                padding: "0.125rem 0.375rem",
                color: "var(--text-tertiary)",
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, paddingTop: "0.25rem", overflowY: "auto" }}>
          <div style={{ marginBottom: "0.25rem", padding: "0 0.75rem 0.5rem" }}>
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "0 0.125rem",
              }}
            >
              Main Menu
            </span>
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={17} className="nav-icon" />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
              </Link>
            );
          })}

          {user?.role === "ADMIN" && (
            <>
              <div
                style={{
                  margin: "0.75rem 0 0.5rem",
                  padding: "0 0.75rem 0.5rem",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "0.75rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "0 0.125rem",
                  }}
                >
                  Admin
                </span>
              </div>
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? "active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon size={17} className="nav-icon" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User Profile */}
        <div
          style={{
            padding: "0.75rem",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem",
              borderRadius: "0.625rem",
              background: "var(--bg-tertiary)",
            }}
          >
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "0.875rem",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.name}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                {user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                padding: "0.375rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                borderRadius: "0.375rem",
                transition: "all 0.15s",
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: "0.75rem", paddingBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "var(--brand-600)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Designed & Developed by AJITH
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              padding: "0.375rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              borderRadius: "0.375rem",
              display: "none",
            }}
            className="mobile-menu-btn"
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb / Page Title */}
          <div style={{ flex: 1 }}>
            <PageTitle pathname={pathname} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => setCommandOpen(true)}
              className="btn btn-ghost btn-sm"
              title="Search (Ctrl+K)"
            >
              <Search size={16} />
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content page-enter">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        {[
          { icon: LayoutDashboard, href: "/dashboard", label: "Dashboard" },
          { icon: Package, href: "/inventory", label: "Stock" },
          { icon: Receipt, href: "/invoices", label: "Invoices" },
          { icon: Users, href: "/customers", label: "Customers" },
          { icon: BarChart3, href: "/reports", label: "Reports" },
        ].map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem",
                color: isActive ? "var(--brand-600)" : "var(--text-tertiary)",
                textDecoration: "none",
                fontSize: "0.625rem",
                fontWeight: 500,
                transition: "color 0.15s",
              }}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Command Palette */}
      {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} />}

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .mobile-close-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function PageTitle({ pathname }: { pathname: string }) {
  const titleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/inventory": "Inventory",
    "/customers": "Customers",
    "/quotations": "Quotations",
    "/invoices": "Invoices",
    "/orders": "Orders",
    "/reports": "Reports",
    "/settings": "Settings",
  };

  const base = "/" + pathname.split("/")[1];
  const title = titleMap[base] || "GarmentOS";

  return (
    <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>
      {title}
    </span>
  );
}

function NotificationBell() {
  return (
    <button className="btn btn-ghost btn-sm" style={{ position: "relative" }}>
      <Bell size={16} />
      <span
        style={{
          position: "absolute",
          top: "0.375rem",
          right: "0.375rem",
          width: "0.5rem",
          height: "0.5rem",
          borderRadius: "50%",
          background: "var(--danger)",
          border: "2px solid var(--bg-secondary)",
        }}
      />
    </button>
  );
}
