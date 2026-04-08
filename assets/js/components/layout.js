export function initLayout(currentKey = "dashboard") {
  const sidebar = document.getElementById("sidebarNav");
  if (!sidebar) return;

  sidebar.querySelectorAll("[data-nav]").forEach(link => {
    if (link.dataset.nav === currentKey) link.classList.add("active");
  });

  const pageTitle = document.body.dataset.pageTitle || "Dashboard";
  const titleNode = document.getElementById("pageTitle");
  if (titleNode) titleNode.textContent = pageTitle;
}
