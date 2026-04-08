import { $, $$ } from "../utils/dom.js";

export function initLayout(currentKey = "dashboard") {
  const sidebarNav = $("#sidebarNav");
  const menuBtn = $("#mobileMenuBtn");
  const backdrop = $("#mobileBackdrop");

  if (sidebarNav) {
    $$("[data-nav]", sidebarNav).forEach(link => {
      link.classList.toggle("active", link.dataset.nav === currentKey);
      link.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
    });
  }

  const pageTitle = document.body.dataset.pageTitle || "Bảng điều khiển";
  const pageTitleNode = $("#pageTitle");
  if (pageTitleNode) pageTitleNode.textContent = pageTitle;

  const toggleSidebar = () => document.body.classList.toggle("sidebar-open");
  const closeSidebar = () => document.body.classList.remove("sidebar-open");

  menuBtn?.addEventListener("click", toggleSidebar);
  backdrop?.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSidebar();
  });
}
