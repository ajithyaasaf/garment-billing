"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ComboboxInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

/**
 * ComboboxInput – best-practice hybrid input.
 * - Typing filters the suggestion list (case-insensitive).
 * - Clicking a suggestion fills the input.
 * - Any arbitrary text value is also accepted (no forced selection).
 * - Does NOT trigger form submission on selection (unlike <datalist>).
 */
export function ComboboxInput({
  value,
  onChange,
  options,
  placeholder,
  className = "form-input",
  style,
  id,
}: ComboboxInputProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  const selectOption = useCallback(
    (opt: string) => {
      onChange(opt);
      setOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Prevent form submission if a suggestion is highlighted
      if (open && highlightedIndex >= 0 && filtered[highlightedIndex]) {
        e.preventDefault();
        selectOption(filtered[highlightedIndex]);
      } else {
        // Let the form handle Enter normally (submit)
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={className}
        style={style}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "0.5rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            listStyle: "none",
            margin: 0,
            padding: "0.25rem",
            maxHeight: "180px",
            overflowY: "auto",
          }}
        >
          {filtered.map((opt, idx) => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              onMouseDown={(e) => {
                // Use mousedown so it fires before the input's onBlur
                e.preventDefault();
                selectOption(opt);
              }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              style={{
                padding: "0.4375rem 0.625rem",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
                background:
                  idx === highlightedIndex
                    ? "var(--brand-50, rgba(79,70,229,0.1))"
                    : value === opt
                    ? "var(--bg-tertiary)"
                    : "transparent",
                color:
                  idx === highlightedIndex
                    ? "var(--brand-600)"
                    : "var(--text-primary)",
                fontWeight: value === opt ? 600 : 400,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {/* Colour swatch for colour options */}
              {/^#[0-9A-Fa-f]{3,6}$/.test(opt) === false &&
                ["Red","Blue","Green","White","Black","Yellow","Pink","Orange","Purple","Grey","Navy","Maroon","Beige","Brown","Cream","Sky Blue","Rust","Olive","Teal","Magenta","Coral","Indigo","Lavender","Dark Blue","Dark Green","Light Blue","Light Green","Off White"].includes(opt) && (
                <span
                  style={{
                    width: "0.75rem",
                    height: "0.75rem",
                    borderRadius: "50%",
                    background: colorToHex(opt),
                    border: "1px solid var(--border-color)",
                    flexShrink: 0,
                  }}
                />
              )}
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function colorToHex(name: string): string {
  const map: Record<string, string> = {
    Red: "#ef4444",
    Blue: "#3b82f6",
    Green: "#22c55e",
    White: "#ffffff",
    Black: "#000000",
    Yellow: "#eab308",
    Pink: "#ec4899",
    Orange: "#f97316",
    Purple: "#a855f7",
    Grey: "#9ca3af",
    Navy: "#1e3a5f",
    Maroon: "#7f1d1d",
    Beige: "#d4c5a9",
    Brown: "#92400e",
    Cream: "#fdf8f0",
    "Sky Blue": "#7dd3fc",
    Rust: "#c2410c",
    Olive: "#65a30d",
    Teal: "#14b8a6",
    Magenta: "#d946ef",
    Coral: "#fb7185",
    Indigo: "#6366f1",
    Lavender: "#c4b5fd",
    "Dark Blue": "#1e40af",
    "Dark Green": "#15803d",
    "Light Blue": "#bae6fd",
    "Light Green": "#86efac",
    "Off White": "#f8f4ec",
  };
  return map[name] ?? "#e5e7eb";
}
