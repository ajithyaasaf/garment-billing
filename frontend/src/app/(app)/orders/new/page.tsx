"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewOrderRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId") || "";

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("mode", "ORDER");
    if (customerId) params.set("customerId", customerId);
    router.replace(`/sales/new?${params.toString()}`);
  }, [router, customerId]);

  return <div style={{ padding: "2rem" }}>Redirecting to Unified Sales Form...</div>;
}
