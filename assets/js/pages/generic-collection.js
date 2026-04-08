import { initLayout } from "../components/layout.js";
import { $, $$, showToast, toggleLoading } from "../utils/dom.js";
import { escapeHtml, formatCurrency, formatDate, toInputDateTimeLocal } from "../utils/format.js";
import { schemas } from "../services/schema.js";
import { normalizePayload } from "../services/normalizers.js";
import { getCollection, createDocument, updateDocument, removeDocument, withServerTimestamp } from "../../../firebase/firestore-service.js";
import { uploadImageFile } from "../../../firebase/storage-service.js";

const type = document.body.dataset.collection;
const schema = schemas[type];
const timestampCollections = new Set(["categories", "products", "users"]);
const imagePreviewPlaceholder = "https://placehold.co/240x140?text=Preview";
const imageFieldStates = new Map();

let records = [];
let editingId = null;

initLayout(type);

const tableHead = $("#tableHead");
const tableBody = $("#tableBody");
const pageHeading = $("#pageHeading");
const pageCaption = $("#pageCaption");
const modal = $("#modal");
const formGrid = $("#formGrid");
const form = $("#entityForm");
const modalTitle = $("#modalTitle");
const saveBtn = $("#saveBtn");
const searchInput = $("#searchInput");

pageHeading.textContent = schema.title;
pageCaption.textContent = `Quản lý dữ liệu collection ${schema.collection}.`;

renderHead();
renderFormFields();
bindEvents();
loadData();

function renderHead() {
  tableHead.innerHTML = `
    <tr>
      ${schema.columns.map(col => `<th>${col.label}</th>`).join("")}
      <th class="actions-col">Thao tác</th>
    </tr>
  `;
}

function renderFormFields() {
  releaseImagePreviewUrls();
  imageFieldStates.clear();

  formGrid.innerHTML = schema.form.map(field => {
    if (field.type === "textarea") {
      return `
        <label class="field">
          <span>${field.label}</span>
          <textarea name="${field.key}" ${field.required ? "required" : ""}></textarea>
        </label>
      `;
    }
    if (field.type === "select") {
      return `
        <label class="field">
          <span>${field.label}</span>
          <select name="${field.key}" ${field.required ? "required" : ""}>
            ${field.options.map(option => `<option value="${option}">${option}</option>`).join("")}
          </select>
        </label>
      `;
    }
    if (field.type === "checkbox") {
      return `
        <label class="field field-checkbox">
          <input type="checkbox" name="${field.key}">
          <span>${field.label}</span>
        </label>
      `;
    }
    if (field.type === "image-source") {
      return `
        <label class="field field-image" data-image-field="${field.key}" data-required="${field.required ? "1" : "0"}">
          <span>${field.label}</span>
          <input type="text" name="${field.key}" data-image-url="${field.key}" placeholder="Dán URL ảnh (https://...)">
          <div class="image-upload-row">
            <input type="file" name="${field.key}File" data-image-file="${field.key}" accept="image/*">
            <small>Có thể dán link hoặc chọn ảnh từ thiết bị. Nếu nhập cả hai thì ưu tiên file.</small>
          </div>
          <img src="${imagePreviewPlaceholder}" alt="preview" class="form-image-preview" data-image-preview="${field.key}">
        </label>
      `;
    }
    return `
      <label class="field">
        <span>${field.label}</span>
        <input type="${field.type}" name="${field.key}" ${field.required ? "required" : ""}>
      </label>
    `;
  }).join("");

  schema.form
    .filter(field => field.type === "image-source")
    .forEach(field => registerImageField(field.key));
}

function registerImageField(fieldKey) {
  const wrapper = formGrid.querySelector(`[data-image-field="${fieldKey}"]`);
  if (!wrapper) return;

  const urlInput = wrapper.querySelector(`[data-image-url="${fieldKey}"]`);
  const fileInput = wrapper.querySelector(`[data-image-file="${fieldKey}"]`);
  const preview = wrapper.querySelector(`[data-image-preview="${fieldKey}"]`);
  if (!urlInput || !fileInput || !preview) return;

  const state = {
    urlInput,
    fileInput,
    preview,
    previewObjectUrl: null
  };
  imageFieldStates.set(fieldKey, state);

  const updatePreview = () => renderImagePreview(fieldKey);
  urlInput.addEventListener("input", () => {
    if (!fileInput.files?.length) {
      updatePreview();
    }
  });
  fileInput.addEventListener("change", updatePreview);
  preview.addEventListener("error", () => {
    if (preview.src !== imagePreviewPlaceholder) {
      preview.src = imagePreviewPlaceholder;
    }
  });

  updatePreview();
}

function clearImagePreviewObjectUrl(state) {
  if (!state?.previewObjectUrl) return;
  URL.revokeObjectURL(state.previewObjectUrl);
  state.previewObjectUrl = null;
}

function renderImagePreview(fieldKey) {
  const state = imageFieldStates.get(fieldKey);
  if (!state) return;

  clearImagePreviewObjectUrl(state);
  const file = state.fileInput.files?.[0];
  if (file) {
    state.previewObjectUrl = URL.createObjectURL(file);
    state.preview.src = state.previewObjectUrl;
    return;
  }
  state.preview.src = (state.urlInput.value || "").trim() || imagePreviewPlaceholder;
}

function renderAllImagePreviews() {
  imageFieldStates.forEach((_, fieldKey) => renderImagePreview(fieldKey));
}

function releaseImagePreviewUrls() {
  imageFieldStates.forEach(state => clearImagePreviewObjectUrl(state));
}

function bindEvents() {
  $("#openCreateModal").addEventListener("click", () => openModal());
  $("#closeModal").addEventListener("click", closeModal);
  $("#closeModalSecondary").addEventListener("click", closeModal);
  $("#modalOverlay").addEventListener("click", closeModal);
  form.addEventListener("submit", onSubmit);
  searchInput.addEventListener("input", renderRows);
}

async function loadData() {
  tableBody.innerHTML = `<tr><td colspan="${schema.columns.length + 1}" class="table-empty">Đang tải dữ liệu...</td></tr>`;
  try {
    records = await getCollection(schema.collection, {
      orderByField: schema.orderByField,
      orderDirection: schema.orderDirection
    });
    renderRows();
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = `<tr><td colspan="${schema.columns.length + 1}" class="table-empty">Không thể tải dữ liệu từ Firebase.</td></tr>`;
  }
}

function renderRows() {
  const keyword = (searchInput.value || "").trim().toLowerCase();
  const filtered = !keyword ? records : records.filter(item => JSON.stringify(item).toLowerCase().includes(keyword));

  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="${schema.columns.length + 1}" class="table-empty">Không có dữ liệu phù hợp.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(item => `
    <tr>
      ${schema.columns.map(col => `<td>${renderCell(col, item[col.key])}</td>`).join("")}
      <td>
        <div class="table-actions">
          <button class="table-btn" data-edit="${item.docId}">Sửa</button>
          <button class="table-btn danger" data-delete="${item.docId}">Xóa</button>
        </div>
      </td>
    </tr>
  `).join("");

  $$("[data-edit]").forEach(btn => btn.addEventListener("click", () => {
    const record = records.find(item => item.docId === btn.dataset.edit);
    openModal(record);
  }));
  $$("[data-delete]").forEach(btn => btn.addEventListener("click", async () => {
    const confirmed = confirm("Bạn có chắc muốn xóa dữ liệu này?");
    if (!confirmed) return;
    try {
      await removeDocument(schema.collection, btn.dataset.delete);
      showToast("Đã xóa dữ liệu.");
      await loadData();
    } catch (error) {
      console.error(error);
      showToast("Xóa dữ liệu thất bại.", "error");
    }
  }));
}

function renderCell(column, value) {
  if (column.type === "image") {
    const src = value || "https://placehold.co/80x56?text=No+Image";
    return `<img src="${escapeHtml(src)}" alt="" class="table-image">`;
  }
  if (column.type === "badge") {
    const text = column.transform ? column.transform(value) : value;
    const extra = /đang bán|đang hoạt động|admin|event|promotion|news/i.test(String(text)) ? "success" : "";
    return `<span class="badge ${extra}">${escapeHtml(text || "--")}</span>`;
  }
  if (column.type === "currency") {
    return formatCurrency(value);
  }
  if (column.type === "date") {
    return formatDate(value);
  }
  return escapeHtml(value ?? "--");
}

function openModal(record = null) {
  editingId = record?.docId || null;
  modal.classList.add("show");
  modalTitle.textContent = record ? `Chỉnh sửa ${schema.title}` : `Thêm ${schema.title}`;
  form.reset();

  schema.form.forEach(field => {
    const input = form.elements[field.key];
    if (!input) return;
    if (!record) {
      if (field.type === "checkbox") input.checked = false;
      return;
    }

    if (field.type === "checkbox") input.checked = Boolean(record[field.key]);
    else if (field.type === "datetime-local") input.value = toInputDateTimeLocal(record[field.key]);
    else input.value = record[field.key] ?? "";
  });

  imageFieldStates.forEach(state => {
    state.fileInput.value = "";
  });
  renderAllImagePreviews();

  const idInput = form.elements.id;
  if (idInput && type === "users") {
    idInput.readOnly = Boolean(record);
  }
}

function closeModal() {
  modal.classList.remove("show");
  editingId = null;
  form.reset();
  releaseImagePreviewUrls();
  imageFieldStates.forEach(state => {
    state.fileInput.value = "";
    state.preview.src = imagePreviewPlaceholder;
  });
}

function collectFormData() {
  const raw = {};
  schema.form.forEach(field => {
    const input = form.elements[field.key];
    if (!input) return;
    raw[field.key] = field.type === "checkbox" ? input.checked : input.value;
  });
  return raw;
}

async function resolveImageFields(raw) {
  const imageFields = schema.form.filter(field => field.type === "image-source");
  for (const field of imageFields) {
    const state = imageFieldStates.get(field.key);
    const file = state?.fileInput?.files?.[0];
    const imageUrl = String(raw[field.key] || "").trim();

    if (file) {
      toggleLoading(saveBtn, true, `Đang tải ${field.label}...`);
      raw[field.key] = await uploadImageFile(file, {
        collectionName: schema.collection,
        fieldKey: field.key,
        recordId: editingId || raw.id || raw.orderId || "new"
      });
    } else {
      raw[field.key] = imageUrl;
    }

    if (field.required && !raw[field.key]) {
      throw new Error(`Vui lòng chọn ảnh hoặc nhập link cho trường "${field.label}".`);
    }
  }
}

async function onSubmit(event) {
  event.preventDefault();
  toggleLoading(saveBtn, true, "Đang lưu...");
  try {
    const raw = collectFormData();
    await resolveImageFields(raw);

    let payload = normalizePayload(type, raw);

    if (!editingId) {
      if (timestampCollections.has(type)) {
        payload = withServerTimestamp(payload, "createdAt");
      }
      await createDocument(schema.collection, payload, type === "users" ? payload.id : null);
      showToast("Đã thêm dữ liệu mới.");
    } else {
      await updateDocument(schema.collection, editingId, payload);
      showToast("Đã cập nhật dữ liệu.");
    }

    closeModal();
    await loadData();
  } catch (error) {
    console.error(error);
    showToast(error?.message || "Lưu dữ liệu thất bại.", "error");
  } finally {
    toggleLoading(saveBtn, false);
  }
}
