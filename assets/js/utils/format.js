export function formatCurrency(value = 0) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

export function formatCompactK(value = 0) {
  const num = Number(value || 0);
  if (num >= 1000) {
    return `${(num / 1000).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")}k`;
  }
  return num.toLocaleString("vi-VN");
}

export function formatDate(value) {
  if (!value) return "--";
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value.toLocaleString("vi-VN");
    return "--";
  }
  if (typeof value === "number") {
    return new Date(value).toLocaleString("vi-VN");
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString("vi-VN");
    return value;
  }
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleString("vi-VN");
  }
  return "--";
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function toInputDateTimeLocal(value) {
  if (!value) return "";
  let date = null;
  if (typeof value === "number") date = new Date(value);
  else if (value?.seconds) date = new Date(value.seconds * 1000);
  else date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
