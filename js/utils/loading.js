export function setButtonLoading(button, loading, loadingText = "Đang xử lý...") {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    button.classList.add("is-loading");
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
    button.classList.remove("is-loading");
  }
}

export function renderTableSkeleton(tbody, colSpan, rows = 6) {
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: rows }).map(() => `
    <tr>
      <td colspan="${colSpan}">
        <div class="skeleton-row">
          <span class="skeleton-line w-20"></span>
          <span class="skeleton-line w-40"></span>
          <span class="skeleton-line w-25"></span>
        </div>
      </td>
    </tr>
  `).join("");
}

export function renderTableEmpty(tbody, colSpan, message = "Chưa có dữ liệu.") {
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}" class="table-empty">
        <div class="empty-state">
          <h4>Dữ liệu trống</h4>
          <p>${message}</p>
        </div>
      </td>
    </tr>
  `;
}

export function renderPanelLoading(root, message = "Đang tải...") {
  if (!root) return;
  root.innerHTML = `<div class="panel-loading"><span class="spinner"></span><p>${message}</p></div>`;
}
