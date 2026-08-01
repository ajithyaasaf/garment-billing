import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

export function getPaymentStatusBadge(status: string): string {
  const map: Record<string, string> = {
    PAID: "badge-success",
    PARTIAL: "badge-warning",
    UNPAID: "badge-danger",
  };
  return map[status] || "badge-gray";
}

export function getOrderStatusBadge(status: string): string {
  const map: Record<string, string> = {
    DELIVERED: "badge-success",
    COMPLETED: "badge-success",
    SHIPPED: "badge-primary",
    PENDING: "badge-warning",
    CANCELLED: "badge-danger",
  };
  return map[status] || "badge-gray";
}

export function getQuotationStatusBadge(status: string): string {
  const map: Record<string, string> = {
    ACCEPTED: "badge-success",
    DRAFT: "badge-gray",
    SENT: "badge-info",
    REJECTED: "badge-danger",
    CONVERTED: "badge-purple",
  };
  return map[status] || "badge-gray";
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const withCountry = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppShare({
  phone,
  customerName,
  documentType,
  documentNumber,
  totalAmount,
  date,
  paymentStatus,
}: {
  phone?: string;
  customerName?: string;
  documentType: string;
  documentNumber: string;
  totalAmount: number;
  date?: string;
  paymentStatus?: string;
  docUrl?: string; // kept for API compatibility but not used in message
}) {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const statusLine = paymentStatus === "PAID" ? "Payment: PAID ✓" : paymentStatus === "PARTIAL" ? "Payment: PARTIAL" : "Payment: PENDING";

  const message = `Hello ${customerName || "Customer"},\n\nThank you for shopping with us!\n\n*${documentType}*\nInvoice No: ${documentNumber}\nDate: ${formattedDate}\nAmount: ₹${totalAmount.toFixed(2)}\n${statusLine}\n\nThank you for your business!`;

  const targetUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  if (typeof window !== "undefined") {
    window.open(targetUrl, "_blank");
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
