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
  const raw = (phone || "").replace(/\D/g, "");
  let formattedPhone = "";
  if (raw.length === 10) {
    formattedPhone = `91${raw}`;
  } else if (raw.length > 10) {
    formattedPhone = raw;
  }
  return formattedPhone
    ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppShare({
  phone,
  customerName,
  documentType,
  documentNumber,
  totalAmount,
  dueAmount,
  upiId,
  shopName,
  date,
  paymentStatus,
}: {
  phone?: string;
  customerName?: string;
  documentType: string;
  documentNumber: string;
  totalAmount: number;
  dueAmount?: number;
  upiId?: string;
  shopName?: string;
  date?: string;
  paymentStatus?: string;
  docUrl?: string;
}) {
  const rawPhone = (phone || "").replace(/\D/g, "");
  let formattedPhone = "";
  if (rawPhone.length === 10) {
    formattedPhone = `91${rawPhone}`;
  } else if (rawPhone.length > 10) {
    formattedPhone = rawPhone;
  }

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const amountToPay = dueAmount !== undefined ? dueAmount : totalAmount;
  const statusLine =
    paymentStatus === "PAID"
      ? "Payment Status: PAID ✓"
      : paymentStatus === "PARTIAL"
      ? `Payment Status: PARTIAL (Balance Due: ₹${amountToPay.toFixed(2)})`
      : `Payment Status: PENDING (Amount Due: ₹${amountToPay.toFixed(2)})`;

  let message = `Hello ${customerName || "Customer"},\n\nThank you for doing business with us!\n\n*${documentType}*\nInvoice No: ${documentNumber}\nDate: ${formattedDate}\nTotal Amount: ₹${totalAmount.toFixed(2)}\n${statusLine}`;

  // If unpaid/partial, include 1-click UPI Payment link for GPay/PhonePe/Paytm
  if (paymentStatus !== "PAID" && amountToPay > 0) {
    const activeShop = shopName || "Garment Store";
    const cleanUpi = upiId ? upiId.trim() : "";
    const displayUpi = cleanUpi || "pay@upi";

    const upiUri = `upi://pay?pa=${encodeURIComponent(displayUpi)}&pn=${encodeURIComponent(activeShop)}&am=${amountToPay.toFixed(2)}&tr=${encodeURIComponent(documentNumber)}&tn=${encodeURIComponent("Invoice " + documentNumber)}&cu=INR`;

    message += `\n\n*Pay via GPay / PhonePe / Paytm:*`;
    message += `\n${upiUri}`;
    message += `\n\n*UPI ID:* ${displayUpi}`;
  }

  message += `\n\nThank you for your business!`;

  const targetUrl = formattedPhone
    ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  if (typeof window !== "undefined") {
    window.open(targetUrl, "_blank");
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
