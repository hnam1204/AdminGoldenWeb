import { toSafeDate } from "./firebase-date.js";

export function formatCurrency(value = 0) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

export function formatDateTime(value) {
  const date = toSafeDate(value);
  if (!date) return "--";
  return date.toLocaleString("vi-VN");
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
