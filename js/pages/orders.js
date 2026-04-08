import { initLayout } from "./layout.js";
import { $, $$, debounce, showToast } from "../utils/dom.js";
import { confirmAction } from "../utils/confirm.js";
import { formatCurrency, formatDateTime, escapeHtml } from "../utils/format.js";
import { renderPanelLoading, renderTableEmpty, renderTableSkeleton, setButtonLoading } from "../utils/loading.js";
import { listOrders, normalizeOrderForView, removeOrder, updateOrderStatus } from "../services/order-service.js";

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "preparing", label: "Đang chuẩn bị" },
  { value: "shipping", label: "Đang giao hàng" },
  { value: "delivered", label: "Đã giao hàng" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" }
];

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map(item => [item.value, item.label]));
const PAYMENT_MAP = {
  cash: "Tiền mặt",
  cod: "Thanh toán khi nhận hàng",
  transfer: "Chuyển khoản",
  card: "Thẻ",
  momo: "Ví MoMo",
  vnpay: "VNPay"
};

initLayout("orders");

const state = {
  orders: [],
  currentCursor: null,
  nextCursor: null,
  cursorHistory: [],
  page: 1,
  hasNext: false,
  searchMode: false,
  currentDetailId: null,
  selectedStatusOrderId: null
};

const tableBody = $("#ordersTableBody");
const detailPanel = $("#orderDetailPanel");
const searchInput = $("#orderSearch");
const filterBar = $("#orderFilterBar");
const paginationBar = $("#ordersPagination");
const statusModal = $("#statusModal");
const statusModalOverlay = $("#statusModalOverlay");
const statusModalClose = $("#statusModalClose");
const statusCancelBtn = $("#statusCancelBtn");
const statusForm = $("#statusForm");
const statusSelect = $("#statusSelect");
const statusSaveBtn = $("#statusSaveBtn");
const statusModalTitle = $("#statusModalTitle");

renderStatusFilter();
renderStatusSelect();
bindEvents();
loadOrders({ reset: true });

function bindEvents() {
  const onSearch = debounce(() => loadOrders({ reset: true }), 350);
  searchInput?.addEventListener("input", onSearch);

  statusModalOverlay?.addEventListener("click", closeStatusModal);
  statusModalClose?.addEventListener("click", closeStatusModal);
  statusCancelBtn?.addEventListener("click", closeStatusModal);
  statusForm?.addEventListener("submit", onSubmitStatus);
}

function renderStatusFilter() {
  if (!filterBar) return;
  filterBar.innerHTML = `
    <label class="filter-item">
      <span>Trạng thái</span>
      <select id="orderStatusFilter">
        <option value="">Tất cả</option>
        ${STATUS_OPTIONS.map(option => `<option value="${option.value}">${option.label}</option>`).join("")}
      </select>
    </label>
  `;
  $("#orderStatusFilter")?.addEventListener("change", () => loadOrders({ reset: true }));
}

function renderStatusSelect(current = "") {
  if (!statusSelect) return;
  statusSelect.innerHTML = `
    <option value="">-- Chọn trạng thái --</option>
    ${STATUS_OPTIONS.map(option => `<option value="${option.value}">${option.label}</option>`).join("")}
  `;
  statusSelect.value = current || "";
}

function statusLabel(status) {
  return STATUS_MAP[String(status || "").toLowerCase()] || status || "--";
}

function paymentLabel(method) {
  return PAYMENT_MAP[String(method || "").toLowerCase()] || method || "--";
}

function statusClass(status = "") {
  const value = String(status).toLowerCase();
  if (["completed", "delivered"].includes(value) || value.includes("hoàn")) return "success";
  if (["shipping", "preparing", "confirmed", "pending"].includes(value)) return "warning";
  if (["cancelled"].includes(value) || value.includes("hủy")) return "danger";
  return "";
}

async function loadOrders({ reset = false } = {}) {
  if (reset) {
    state.currentCursor = null;
    state.nextCursor = null;
    state.cursorHistory = [];
    state.page = 1;
  }

  renderTableSkeleton(tableBody, 9, 6);
  renderPanelLoading(detailPanel, "Đang tải chi tiết đơn hàng...");

  try {
    const result = await listOrders({
      cursor: state.currentCursor,
      pageSize: 10,
      searchKeyword: searchInput?.value || "",
      filters: {
        status: $("#orderStatusFilter")?.value || ""
      }
    });

    state.orders = (result.items || []).map(normalizeOrderForView);
    state.nextCursor = result.nextCursor || null;
    state.hasNext = Boolean(result.hasNext);
    state.searchMode = Boolean(result.searchMode);

    renderOrders();
    renderPagination();

    const current = state.orders.find(item => item.docId === state.currentDetailId) || state.orders[0];
    state.currentDetailId = current?.docId || null;
    detailPanel.innerHTML = current ? renderDetail(current) : renderEmptyDetail();
  } catch (error) {
    console.error(error);
    renderTableEmpty(tableBody, 9, "Không thể tải đơn hàng từ Firebase.");
    detailPanel.innerHTML = renderEmptyDetail("Không thể tải chi tiết đơn hàng.");
    renderPagination();
  }
}

function renderOrders() {
  if (!state.orders.length) {
    renderTableEmpty(tableBody, 9, "Không có đơn hàng phù hợp với điều kiện tìm kiếm.");
    return;
  }

  tableBody.innerHTML = state.orders.map(order => `
    <tr>
      <td>${escapeHtml(order.orderId || order.docId)}</td>
      <td>${escapeHtml(order.customerName || "--")}</td>
      <td>${escapeHtml(order.customerPhone || "--")}</td>
      <td>${escapeHtml(order.deliveryAddress || "--")}</td>
      <td><span class="badge">${escapeHtml(paymentLabel(order.paymentMethod))}</span></td>
      <td><span class="badge ${statusClass(order.status)}">${escapeHtml(statusLabel(order.status))}</span></td>
      <td>${formatCurrency(order.totalPrice)}</td>
      <td>${formatDateTime(order.date)}</td>
      <td>
        <div class="table-actions">
          <button class="table-btn" type="button" data-action="view" data-id="${order.docId}">Xem</button>
          <button class="table-btn" type="button" data-action="status" data-id="${order.docId}">Cập nhật</button>
          <button class="table-btn danger" type="button" data-action="delete" data-id="${order.docId}">Xóa</button>
        </div>
      </td>
    </tr>
  `).join("");

  $$("[data-action='view']", tableBody).forEach(btn => {
    btn.addEventListener("click", () => {
      const order = state.orders.find(item => item.docId === btn.dataset.id);
      state.currentDetailId = order?.docId || null;
      detailPanel.innerHTML = order ? renderDetail(order) : renderEmptyDetail();
    });
  });

  $$("[data-action='status']", tableBody).forEach(btn => {
    btn.addEventListener("click", () => {
      const order = state.orders.find(item => item.docId === btn.dataset.id);
      openStatusModal(order);
    });
  });

  $$("[data-action='delete']", tableBody).forEach(btn => {
    btn.addEventListener("click", async () => {
      const order = state.orders.find(item => item.docId === btn.dataset.id);
      const confirmed = await confirmAction({
        title: "Xác nhận xóa đơn hàng",
        message: `Bạn có chắc chắn muốn xóa đơn ${order?.orderId || order?.docId || ""} không?`,
        confirmText: "Xóa đơn",
        cancelText: "Hủy",
        danger: true
      });
      if (!confirmed) return;

      try {
        await removeOrder(btn.dataset.id);
        showToast("Đã xóa đơn hàng.");
        await loadOrders({ reset: true });
      } catch (error) {
        console.error(error);
        showToast("Xóa đơn hàng thất bại.", "error");
      }
    });
  });
}

function renderPagination() {
  if (!paginationBar) return;
  if (state.searchMode) {
    paginationBar.innerHTML = `<p class="pagination-note">Đang hiển thị kết quả tìm kiếm theo từ khóa.</p>`;
    return;
  }
  paginationBar.innerHTML = `
    <button class="secondary-btn" type="button" data-page-action="prev" ${state.page <= 1 ? "disabled" : ""}>Trang trước</button>
    <span class="pagination-note">Trang ${state.page}</span>
    <button class="secondary-btn" type="button" data-page-action="next" ${!state.hasNext ? "disabled" : ""}>Trang sau</button>
  `;

  const prev = paginationBar.querySelector("[data-page-action='prev']");
  const next = paginationBar.querySelector("[data-page-action='next']");
  prev?.addEventListener("click", async () => {
    if (state.page <= 1) return;
    state.currentCursor = state.cursorHistory.pop() || null;
    state.page = Math.max(1, state.page - 1);
    await loadOrders({ reset: false });
  });
  next?.addEventListener("click", async () => {
    if (!state.hasNext || !state.nextCursor) return;
    state.cursorHistory.push(state.currentCursor);
    state.currentCursor = state.nextCursor;
    state.page += 1;
    await loadOrders({ reset: false });
  });
}

function openStatusModal(order) {
  if (!order) return;
  state.selectedStatusOrderId = order.docId;
  statusModal.classList.add("show");
  statusModalTitle.textContent = `Cập nhật trạng thái đơn ${order.orderId || order.docId}`;
  renderStatusSelect(String(order.status || "").toLowerCase());
}

function closeStatusModal() {
  statusModal.classList.remove("show");
  state.selectedStatusOrderId = null;
  statusForm?.reset();
}

async function onSubmitStatus(event) {
  event.preventDefault();
  if (!state.selectedStatusOrderId) return;
  const nextStatus = String(statusSelect.value || "").trim().toLowerCase();
  if (!nextStatus) {
    showToast("Vui lòng chọn trạng thái.", "error");
    return;
  }
  setButtonLoading(statusSaveBtn, true, "Đang lưu...");
  try {
    await updateOrderStatus(state.selectedStatusOrderId, nextStatus);
    showToast("Đã cập nhật trạng thái đơn hàng.");
    const updatedId = state.selectedStatusOrderId;
    closeStatusModal();
    await loadOrders({ reset: false });
    const updated = state.orders.find(item => item.docId === updatedId);
    if (updated) {
      state.currentDetailId = updated.docId;
      detailPanel.innerHTML = renderDetail(updated);
    }
  } catch (error) {
    console.error(error);
    showToast("Cập nhật trạng thái thất bại.", "error");
  } finally {
    setButtonLoading(statusSaveBtn, false);
  }
}

function renderDetail(order) {
  const items = order.items || [];
  return `
    <div class="detail-card">
      <div class="detail-head">
        <div>
          <h3>Chi tiết đơn ${escapeHtml(order.orderId || order.docId)}</h3>
          <p>${escapeHtml(order.customerName || "--")} • ${escapeHtml(order.customerPhone || "--")}</p>
        </div>
        <span class="badge ${statusClass(order.status)}">${escapeHtml(statusLabel(order.status))}</span>
      </div>

      <div class="detail-meta">
        <div><span>Địa chỉ giao hàng</span><strong>${escapeHtml(order.deliveryAddress || "--")}</strong></div>
        <div><span>Thanh toán</span><strong>${escapeHtml(paymentLabel(order.paymentMethod))}</strong></div>
        <div><span>Ngày đặt</span><strong>${formatDateTime(order.date)}</strong></div>
        <div><span>Tổng tiền</span><strong>${formatCurrency(order.totalPrice)}</strong></div>
      </div>

      <div class="detail-list">
        ${items.length ? items.map((item, index) => {
          const product = item.product || {};
          return `
            <article class="order-item">
              <img src="${escapeHtml(product.imageUrl || "https://placehold.co/88x88?text=San+pham")}" alt="sản phẩm">
              <div class="order-item-content">
                <h4>${index + 1}. ${escapeHtml(product.name || "--")}</h4>
                <p>${escapeHtml(product.categoryName || "--")} • Kích thước ${escapeHtml(item.size || "--")} • Số lượng ${escapeHtml(item.quantity || 0)}</p>
                <p>Đá: ${escapeHtml(item.ice || "--")} • Đường: ${escapeHtml(item.sugar || "--")} • Topping: ${escapeHtml(item.topping || "Không")}</p>
                <p>Ghi chú: ${escapeHtml(item.note || "Không có")}</p>
                <p>Trạng thái sản phẩm: <strong>${product.isAvailable ? "Đang bán" : "Ngưng bán"}</strong></p>
              </div>
              <strong>${formatCurrency(item.totalPrice)}</strong>
            </article>
          `;
        }).join("") : `<p class="table-empty">Đơn hàng chưa có sản phẩm.</p>`}
      </div>
    </div>
  `;
}

function renderEmptyDetail(message = "Chọn một đơn hàng để xem chi tiết sản phẩm, thanh toán và trạng thái.") {
  return `
    <div class="detail-card empty">
      <h3>Chi tiết đơn hàng</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}
