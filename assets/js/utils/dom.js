export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

export function toggleLoading(el, loading, loadingText = "Đang tải...") {
  if (!el) return;
  if (loading) {
    el.dataset.originalText = el.textContent;
    el.disabled = true;
    el.textContent = loadingText;
  } else {
    el.disabled = false;
    el.textContent = el.dataset.originalText || el.textContent;
  }
}

export function showToast(message, type = "success") {
  const root = document.getElementById("toastRoot");
  if (!root) return;
  const item = document.createElement("div");
  item.className = `toast toast-${type}`;
  item.textContent = message;
  root.appendChild(item);
  requestAnimationFrame(() => item.classList.add("show"));
  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 250);
  }, 2800);
}
