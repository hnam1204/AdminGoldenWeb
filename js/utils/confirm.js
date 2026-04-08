import { createElement } from "./dom.js";

let dialog = null;
let titleNode = null;
let messageNode = null;
let cancelBtn = null;
let confirmBtn = null;
let resolver = null;

function closeDialog(result) {
  if (!dialog) return;
  dialog.classList.remove("show");
  setTimeout(() => dialog.classList.remove("visible"), 120);
  if (resolver) resolver(result);
  resolver = null;
}

function ensureDialog() {
  if (dialog) return;

  dialog = createElement("div", "confirm-dialog");
  dialog.innerHTML = `
    <div class="confirm-overlay" data-close="1"></div>
    <div class="confirm-card">
      <h4 id="confirmTitle">Xác nhận thao tác</h4>
      <p id="confirmMessage">Bạn có chắc chắn muốn tiếp tục?</p>
      <div class="confirm-actions">
        <button type="button" class="secondary-btn" id="confirmCancel">Hủy</button>
        <button type="button" class="primary-btn danger" id="confirmAccept">Xác nhận</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);
  titleNode = dialog.querySelector("#confirmTitle");
  messageNode = dialog.querySelector("#confirmMessage");
  cancelBtn = dialog.querySelector("#confirmCancel");
  confirmBtn = dialog.querySelector("#confirmAccept");

  dialog.addEventListener("click", event => {
    const target = event.target;
    if (target?.dataset?.close) closeDialog(false);
  });
  cancelBtn.addEventListener("click", () => closeDialog(false));
  confirmBtn.addEventListener("click", () => closeDialog(true));
}

export function confirmAction(options = {}) {
  ensureDialog();
  const {
    title = "Xác nhận thao tác",
    message = "Bạn có chắc chắn muốn tiếp tục?",
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    danger = false
  } = options;

  titleNode.textContent = title;
  messageNode.textContent = message;
  cancelBtn.textContent = cancelText;
  confirmBtn.textContent = confirmText;
  confirmBtn.classList.toggle("danger", danger);

  dialog.classList.add("visible");
  requestAnimationFrame(() => dialog.classList.add("show"));

  return new Promise(resolve => {
    resolver = resolve;
  });
}
