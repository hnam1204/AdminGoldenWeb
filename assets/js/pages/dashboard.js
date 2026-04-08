import { initLayout } from "../components/layout.js";
import { formatCompactK, formatCurrency } from "../utils/format.js";
import { getCollection } from "../../../firebase/firestore-service.js";

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
    const [orders, users, products, news] = await Promise.all([
      getCollection("orders"),
      getCollection("users"),
      getCollection("products"),
      getCollection("news")
    ]);

    const totalRevenue = orders.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

    revenueEl.textContent = formatCompactK(totalRevenue);
    usersEl.textContent = Number(users.length).toLocaleString("vi-VN");
    ordersEl.textContent = Number(orders.length).toLocaleString("vi-VN");
    storageEl.textContent = `${Math.min(99, 70 + Math.round(products.length * 0.7))}.${products.length % 10}%`;

    renderActivity(orders, news, users);
    renderQuickGrid(products, news, users);
    renderChart(orders);
  } catch (error) {
    console.error(error);
    activityEl.innerHTML = `<p class="empty-note">Không thể tải dữ liệu dashboard.</p>`;
  }
}

function renderActivity(orders, news, users) {
  const activities = [
    ...orders.slice(0, 3).map(item => ({
      title: `Đơn ${item.orderId || item.docId} từ ${item.customerName || "Khách hàng"}`,
      meta: `${item.status || "Đang xử lý"} • ${formatCurrency(item.totalPrice)}`,
      avatar: "🛍️"
    })),
    ...news.slice(0, 2).map(item => ({
      title: `Tin tức mới: ${item.title || "Bài viết"}`,
      meta: item.type || "news",
      avatar: "📰"
    })),
    ...users.slice(0, 2).map(item => ({
      title: `Người dùng: ${item.fullName || item.email || "User"}`,
      meta: item.role || "customer",
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

function renderQuickGrid(products, news, users) {
  const cards = [
    { label: "Sản phẩm", value: products.length, note: "Collection products" },
    { label: "Tin tức", value: news.length, note: "Collection news" },
    { label: "Người dùng", value: users.length, note: "Collection users" }
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
  if (!ctx) return;

  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
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
      labels: days,
      datasets: [
        {
          label: "Tháng hiện tại",
          data: current,
          borderRadius: 20,
          backgroundColor: "#3a7a67",
          maxBarThickness: 34
        },
        {
          label: "Tháng trước",
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
