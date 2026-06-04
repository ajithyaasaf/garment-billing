"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  error = false,
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected Option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filtered Options
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(lowerSearch))
    );
  }, [options, search]);

  // Open & Focus Search Input
  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    setSearch("");
  };

  // Close and Clear Search
  const handleClose = () => {
    setIsOpen(false);
    setSearch("");
  };

  // Select Item
  const handleSelect = (val: string) => {
    onChange(val);
    handleClose();
  };

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      style={{ minWidth: "200px" }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "form-input flex items-center justify-between text-left cursor-pointer",
          error && "error",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-[var(--brand-500)] ring-3 ring-[rgba(59,130,246,0.1)]"
        )}
        style={{
          height: "42px",
          paddingRight: "1rem",
        }}
      >
        <span className="truncate flex items-baseline gap-2">
          {selectedOption ? (
            <>
              <span className="font-medium text-[var(--text-primary)]">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-xs text-[var(--text-tertiary)] truncate">
                  ({selectedOption.sublabel})
                </span>
              )}
            </>
          ) : (
            <span className="text-[var(--text-tertiary)]">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-[var(--text-tertiary)] transition-transform duration-200",
            isOpen && "transform rotate-180"
          )}
        />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              zIndex: 50,
              overflow: "hidden",
            }}
          >
            {/* Search Input Area */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 0.75rem",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <Search size={15} className="text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontSize: "0.875rem",
                  color: "var(--text-primary)",
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="p-1 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-tertiary)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Options List */}
            <div
              style={{
                maxHeight: "240px",
                overflowY: "auto",
                padding: "4px",
              }}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        background: isSelected ? "var(--brand-50)" : "none",
                        color: isSelected ? "var(--brand-700)" : "var(--text-primary)",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        marginBottom: "2px",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "var(--bg-tertiary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "none";
                        }
                      }}
                    >
                      <div className="truncate pr-4">
                        <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: "0.875rem" }}>
                          {option.label}
                        </div>
                        {option.sublabel && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {option.sublabel}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check size={16} className="text-[var(--brand-600)] flex-shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div style={{ padding: "1.25rem 1rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                  No results found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
