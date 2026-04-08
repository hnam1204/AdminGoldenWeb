export function parseBoolean(value) {
  return value === true || value === "true" || value === "1" || value === "on";
}

export function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseInteger(value, fallback = 0) {
  return Math.trunc(parseNumber(value, fallback));
}

export function validateImageFile(file, options = {}) {
  if (!file) return { valid: true, message: "" };
  const maxSizeMB = options.maxSizeMB || 5;
  const allowed = options.allowed || ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { valid: false, message: "Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG, WEBP, GIF." };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, message: `Ảnh vượt quá ${maxSizeMB}MB.` };
  }
  return { valid: true, message: "" };
}

export function sanitizeKeyword(value) {
  return String(value || "").trim();
}

export function validateCategoryId(categoryId, categories = []) {
  const id = parseInteger(categoryId, 0);
  if (!id) return { valid: false, message: "ID danh mục không hợp lệ." };
  if (!categories.length) return { valid: id > 0, message: id > 0 ? "" : "ID danh mục không hợp lệ." };
  const exists = categories.some(item => parseInteger(item.id, 0) === id);
  if (!exists) return { valid: false, message: "Danh mục không tồn tại hoặc chưa được đồng bộ." };
  return { valid: true, message: "" };
}
