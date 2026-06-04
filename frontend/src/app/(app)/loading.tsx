import React from "react";

export default function AppLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} className="page-enter">
      {/* Title Header Skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div className="skeleton" style={{ width: "220px", height: "1.75rem" }} />
        <div className="skeleton" style={{ width: "340px", height: "1rem" }} />
      </div>

      {/* Grid of Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <div className="skeleton" style={{ width: "90px", height: "0.75rem" }} />
                <div className="skeleton" style={{ width: "130px", height: "1.5rem" }} />
              </div>
              <div className="skeleton" style={{ width: "2.25rem", height: "2.25rem", borderRadius: "var(--radius-lg)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Layout Skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        {/* Left main block */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
          <div className="skeleton" style={{ width: "180px", height: "1rem" }} />
          <div className="skeleton" style={{ width: "100%", height: "260px" }} />
        </div>
        {/* Right side block */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
          <div className="skeleton" style={{ width: "140px", height: "1rem" }} />
          <div className="skeleton" style={{ width: "100%", height: "260px" }} />
        </div>
      </div>
    </div>
  );
}
