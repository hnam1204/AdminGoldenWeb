import { initLayout } from "../components/layout.js";
import { $, $$, showToast } from "../utils/dom.js";
import { escapeHtml, formatCurrency, formatDate } from "../utils/format.js";
import { getCollection, updateDocument, removeDocument } from "../../../firebase/firestore-service.js";

initLayout("orders");

const tableBody = $("#ordersTableBody");
const detailPanel = $("#orderDetailPanel");
const searchInput = $("#orderSearch");
let orders = [];

bindEvents();
loadOrders();

function bindEvents() {
  searchInput.addEventListener("input", renderOrders);
}

async function loadOrders() {
  tableBody.innerHTML = `<tr><td colspan="9" class="table-empty">Đang tải đơn hàng...</td></tr>`;
  try {
    orders = await getCollection("orders");
    renderOrders();
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = `<tr><td colspan="9" class="table-empty">Không thể tải đơn hàng từ Firebase.</td></tr>`;
  }
}

function renderOrders() {
  const keyword = (searchInput.value || "").trim().toLowerCase();
  const filtered = !keyword ? orders : orders.filter(item => JSON.stringify(item).toLowerCase().includes(keyword));

  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="9" class="table-empty">Không có đơn hàng phù hợp.</td></tr>`;
    detailPanel.innerHTML = renderEmptyDetail();
    return;
  }

  tableBody.innerHTML = filtered.map(order => `
    <tr>
      <td>${escapeHtml(order.orderId || order.docId)}</td>
      <td>${escapeHtml(order.customerName || "--")}</td>
      <td>${escapeHtml(order.customerPhone || "--")}</td>
      <td>${escapeHtml(order.deliveryAddress || "--")}</td>
      <td><span class="badge">${escapeHtml(order.paymentMethod || "--")}</span></td>
      <td><span class="badge ${statusClass(order.status)}">${escapeHtml(order.status || "--")}</span></td>
      <td>${formatCurrency(order.totalPrice)}</td>
      <td>${formatDate(order.date)}</td>
      <td>
        <div class="table-actions">
          <button class="table-btn" data-view="${order.docId}">Xem</button>
          <button class="table-btn" data-status="${order.docId}">Cập nhật</button>
          <button class="table-btn danger" data-delete="${order.docId}">Xóa</button>
        </div>
      </td>
    </tr>
  `).join("");

  $$("[data-view]").forEach(btn => btn.addEventListener("click", () => {
    const order = orders.find(item => item.docId === btn.dataset.view);
    detailPanel.innerHTML = renderDetail(order);
  }));

  $$("[data-status]").forEach(btn => btn.addEventListener("click", async () => {
    const order = orders.find(item => item.docId === btn.dataset.status);
    const next = prompt("Nhập trạng thái mới:", order?.status || "Đang chuẩn bị");
    if (!next) return;
    try {
      await updateDocument("orders", btn.dataset.status, { status: next });
      showToast("Đã cập nhật trạng thái đơn hàng.");
      await loadOrders();
      const updated = orders.find(item => item.docId === btn.dataset.status);
      detailPanel.innerHTML = renderDetail(updated);
    } catch (error) {
      console.error(error);
      showToast("Cập nhật trạng thái thất bại.", "error");
    }
  }));

  $$("[data-delete]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Xóa đơn hàng này?")) return;
    try {
      await removeDocument("orders", btn.dataset.delete);
      showToast("Đã xóa đơn hàng.");
      await loadOrders();
    } catch (error) {
      console.error(error);
      showToast("Xóa đơn hàng thất bại.", "error");
    }
  }));

  detailPanel.innerHTML = renderDetail(filtered[0]);
}

function statusClass(status = "") {
  const value = status.toLowerCase();
  if (value.includes("hoàn") || value.includes("giao")) return "success";
  if (value.includes("chuẩn")) return "warning";
  if (value.includes("hủy")) return "danger";
  return "";
}

function renderDetail(order) {
  if (!order) return renderEmptyDetail();
  const items = order.items || [];
  return `
    <div class="detail-card">
      <div class="detail-head">
        <div>
          <h3>Chi tiết đơn ${escapeHtml(order.orderId || order.docId)}</h3>
          <p>${escapeHtml(order.customerName || "--")} • ${escapeHtml(order.customerPhone || "--")}</p>
        </div>
        <span class="badge ${statusClass(order.status)}">${escapeHtml(order.status || "--")}</span>
      </div>

      <div class="detail-meta">
        <div><span>Địa chỉ</span><strong>${escapeHtml(order.deliveryAddress || "--")}</strong></div>
        <div><span>Thanh toán</span><strong>${escapeHtml(order.paymentMethod || "--")}</strong></div>
        <div><span>Ngày</span><strong>${formatDate(order.date)}</strong></div>
        <div><span>Tổng tiền</span><strong>${formatCurrency(order.totalPrice)}</strong></div>
      </div>

      <div class="detail-list">
        ${items.length ? items.map((item, index) => `
          <article class="order-item">
            <img src="${escapeHtml(item.product?.imageUrl || "https://placehold.co/88x88?text=Item")}" alt="">
            <div class="order-item-content">
              <h4>${index + 1}. ${escapeHtml(item.product?.name || "--")}</h4>
              <p>${escapeHtml(item.product?.categoryName || "--")} • Size ${escapeHtml(item.size || "--")} • SL ${escapeHtml(item.quantity || 0)}</p>
              <p>Đá: ${escapeHtml(item.ice || "--")} • Đường: ${escapeHtml(item.sugar || "--")} • Topping: ${escapeHtml(item.topping || "Không")}</p>
              <p>Ghi chú: ${escapeHtml(item.note || "Không có")}</p>
            </div>
            <strong>${formatCurrency(item.totalPrice)}</strong>
          </article>
        `).join("") : `<p class="table-empty">Đơn hàng chưa có item.</p>`}
      </div>
    </div>
  `;
}

function renderEmptyDetail() {
  return `
    <div class="detail-card empty">
      <h3>Chi tiết đơn hàng</h3>
      <p>Chọn một đơn hàng để xem chi tiết sản phẩm, thanh toán và trạng thái.</p>
    </div>
  `;
}
