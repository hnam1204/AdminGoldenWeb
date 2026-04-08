import { initLayout } from "./layout.js";
import { formatCurrency } from "../utils/format.js";
import {
  computeRevenueFromOrders,
  getCollectionCount,
  getRecentNews,
  getRecentOrders,
  getRecentUsers
} from "../services/dashboard-service.js";

initLayout("dashboard");

const revenueEl = document.getElementById("metricRevenue");
const usersEl = document.getElementById("metricUsers");
const ordersEl = document.getElementById("metricOrders");
const storageEl = document.getElementById("metricStorage");
const activityEl = document.getElementById("activityList");
const quickGrid = document.getElementById("quickGrid");

let chart;
loadDashboard();

async function loadDashboard() {
  try {
    const [
      usersCount,
      ordersCount,
      productsCount,
      newsCount,
      recentOrders,
      recentNews,
      recentUsers
    ] = await Promise.all([
      getCollectionCount("users"),
      getCollectionCount("orders"),
      getCollectionCount("products"),
      getCollectionCount("news"),
      getRecentOrders(30),
      getRecentNews(6),
      getRecentUsers(6)
    ]);

    const revenue = computeRevenueFromOrders(recentOrders);
    revenueEl.textContent = formatCurrency(revenue);
    usersEl.textContent = Number(usersCount).toLocaleString("vi-VN");
    ordersEl.textContent = Number(ordersCount).toLocaleString("vi-VN");
    storageEl.textContent = `${Math.min(99, 66 + Math.round(productsCount * 0.4))}%`;

    renderActivity(recentOrders, recentNews, recentUsers);
    renderQuickGrid(productsCount, newsCount, usersCount);
    renderChart(recentOrders);
  } catch (error) {
    console.error(error);
    activityEl.innerHTML = `<p class="empty-note">Không thể tải dữ liệu bảng điều khiển.</p>`;
  }
}

function renderActivity(orders, news, users) {
  const typeMap = { event: "Sự kiện", promotion: "Khuyến mãi", news: "Tin tức" };
  const roleMap = { admin: "Quản trị viên", customer: "Khách hàng" };

  const activities = [
    ...orders.slice(0, 3).map(item => ({
      title: `Đơn ${item.orderId || item.docId} từ ${item.customerName || "Khách hàng"}`,
      meta: `${item.status || "Đang xử lý"} • ${formatCurrency(item.totalPrice || 0)}`,
      avatar: "🛍️"
    })),
    ...news.slice(0, 2).map(item => ({
      title: `Tin mới: ${item.title || "Bài viết"}`,
      meta: typeMap[item.type] || "Tin tức",
      avatar: "📰"
    })),
    ...users.slice(0, 2).map(item => ({
      title: `Người dùng: ${item.fullName || item.email || "Người dùng"}`,
      meta: roleMap[item.role] || "Khách hàng",
      avatar: "👤"
    }))
  ].slice(0, 6);

  activityEl.innerHTML = activities.map(item => `
    <article class="activity-item">
      <div class="activity-avatar">${item.avatar}</div>
      <div class="activity-content">
        <h4>${item.title}</h4>
        <p>${item.meta}</p>
      </div>
    </article>
  `).join("");
}

function renderQuickGrid(productsCount, newsCount, usersCount) {
  const cards = [
    { label: "Sản phẩm", value: productsCount, note: "Bộ sưu tập products" },
    { label: "Tin tức", value: newsCount, note: "Bộ sưu tập news" },
    { label: "Người dùng", value: usersCount, note: "Bộ sưu tập users" }
  ];

  quickGrid.innerHTML = cards.map(card => `
    <article class="mini-card">
      <span>${card.label}</span>
      <strong>${Number(card.value).toLocaleString("vi-VN")}</strong>
      <p>${card.note}</p>
    </article>
  `).join("");
}

function renderChart(orders) {
  const ctx = document.getElementById("systemChart");
  if (!ctx || typeof Chart === "undefined") return;

  const labels = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];
  const current = [3, 7, 10, 8, 12, 9, 6];
  const previous = [2, 4, 5, 7, 8, 6, 5];

  if (orders.length) {
    const total = orders.length;
    for (let i = 0; i < 7; i += 1) {
      current[i] = Math.max(2, Math.round((total / 7) + (i % 3) * 2));
      previous[i] = Math.max(1, current[i] - Math.round((i + 2) / 3));
    }
  }

  chart?.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Tuần này",
          data: current,
          borderRadius: 20,
          backgroundColor: "#3a7a67",
          maxBarThickness: 34
        },
        {
          label: "Tuần trước",
          data: previous,
          borderRadius: 20,
          backgroundColor: "#e7e4df",
          maxBarThickness: 34
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 10,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 24,
            color: "#666"
          }
        },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#7a7a7a", font: { size: 11, weight: "600" } }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(0,0,0,0.04)" },
          ticks: { display: false },
          border: { display: false }
        }
      }
    }
  });
}
