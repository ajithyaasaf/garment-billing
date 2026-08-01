"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

interface StatusBadgeSelectProps {
  status: string;
  onChange: (newStatus: string) => void;
  disabled?: boolean;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING: {
    label: "Pending",
    bg: "#fef3c7",
    text: "#b45309",
    dot: "#f59e0b",
  },
  SHIPPED: {
    label: "Shipped",
    bg: "#dbeafe",
    text: "#1e40af",
    dot: "#3b82f6",
  },
  DELIVERED: {
    label: "Delivered",
    bg: "#dcfce7",
    text: "#15803d",
    dot: "#10b981",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "#fee2e2",
    text: "#b91c1c",
    dot: "#ef4444",
  },
};

export function StatusBadgeSelect({ status, onChange, disabled = false }: StatusBadgeSelectProps) {
  const current = statusConfig[status] || {
    label: status,
    bg: "var(--gray-100)",
    text: "var(--gray-700)",
    dot: "var(--gray-400)",
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={disabled} asChild>
        <button
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.25rem 0.625rem",
            borderRadius: "9999px",
            background: current.bg,
            color: current.text,
            fontSize: "0.75rem",
            fontWeight: 700,
            lineHeight: 1,
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            outline: "none",
            transition: "all 0.15s ease-in-out",
          }}
          className="hover:opacity-85 focus:ring-2 focus:ring-blue-500/20"
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: current.dot,
              display: "inline-block",
            }}
          />
          <span>{current.label}</span>
          <ChevronDown size={12} style={{ opacity: 0.7 }} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          style={{
            minWidth: "140px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "0.5rem",
            padding: "0.375rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            zIndex: 100,
          }}
        >
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const isSelected = key === status;
            return (
              <DropdownMenu.Item
                key={key}
                onClick={() => onChange(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.375rem 0.625rem",
                  borderRadius: "0.375rem",
                  fontSize: "0.75rem",
                  fontWeight: isSelected ? 700 : 500,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  outline: "none",
                  transition: "background 0.15s",
                }}
                className="hover:bg-[var(--bg-tertiary)] focus:bg-[var(--bg-tertiary)]"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: cfg.dot,
                    }}
                  />
                  <span>{cfg.label}</span>
                </div>
                {isSelected && <Check size={14} style={{ color: cfg.dot }} />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
