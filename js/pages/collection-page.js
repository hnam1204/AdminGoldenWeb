import { initLayout } from "./layout.js";
import { $, $$, debounce, showToast } from "../utils/dom.js";
import { confirmAction } from "../utils/confirm.js";
import { formatCurrency, formatDateTime, escapeHtml } from "../utils/format.js";
import { toInputDateTimeLocal } from "../utils/firebase-date.js";
import { renderTableEmpty, renderTableSkeleton, setButtonLoading } from "../utils/loading.js";
import { validateImageFile } from "../utils/validators.js";
import { uploadImageToStorage } from "../firebase/firebase-storage.js";

const imagePlaceholder = "https://placehold.co/240x140?text=Xem+truoc";

function toOption(option) {
  if (typeof option === "string" || typeof option === "number") {
    return { value: String(option), label: String(option) };
  }
  return { value: String(option.value ?? ""), label: option.label ?? String(option.value ?? "") };
}

function buildFieldAttrs(field, options = {}) {
  const { allowReadonly = true } = options;
  const attrs = [];
  if (field.required) attrs.push("required");
  if (allowReadonly && field.readonly) attrs.push("readonly");
  if (field.disabled) attrs.push("disabled");
  return attrs.join(" ");
}

export function initCollectionPage(config) {
  const state = {
    records: [],
    editingId: null,
    currentCursor: null,
    nextCursor: null,
    cursorHistory: [],
    page: 1,
    hasNext: false,
    searchMode: false,
    imageStates: new Map(),
    filters: {},
    context: config.context || {}
  };

  const elements = {
    tableHead: $("#tableHead"),
    tableBody: $("#tableBody"),
    pageHeading: $("#pageHeading"),
    pageCaption: $("#pageCaption"),
    modal: $("#modal"),
    formGrid: $("#formGrid"),
    form: $("#entityForm"),
    modalTitle: $("#modalTitle"),
    saveBtn: $("#saveBtn"),
    searchInput: $("#searchInput"),
    openCreateModal: $("#openCreateModal"),
    closeModalBtn: $("#closeModal"),
    closeModalSecondary: $("#closeModalSecondary"),
    modalOverlay: $("#modalOverlay"),
    filterBar: $("#filterBar"),
    paginationBar: $("#paginationBar")
  };

  initLayout(config.navKey);
  elements.pageHeading.textContent = config.title;
  elements.pageCaption.textContent = config.caption;
  if (elements.searchInput && config.searchPlaceholder) {
    elements.searchInput.placeholder = config.searchPlaceholder;
  }

  config.filters?.forEach(filter => {
    state.filters[filter.key] = filter.defaultValue ?? "";
  });

  renderHead();
  renderFilters();
  renderForm();
  bindEvents();
  loadData({ reset: true });

  function bindEvents() {
    elements.openCreateModal?.addEventListener("click", () => {
      openModal().catch(error => {
        console.error(error);
        showToast(error?.message || "KhÃ´ng thá»ƒ má»Ÿ biá»ƒu máº«u.", "error");
      });
    });
    elements.closeModalBtn?.addEventListener("click", closeModal);
    elements.closeModalSecondary?.addEventListener("click", closeModal);
    elements.modalOverlay?.addEventListener("click", closeModal);
    elements.form?.addEventListener("submit", onSubmit);

    if (elements.searchInput) {
      const onSearch = debounce(() => {
        loadData({ reset: true });
      }, config.searchDebounceMs || 350);
      elements.searchInput.addEventListener("input", onSearch);
    }
  }

  function renderHead() {
    elements.tableHead.innerHTML = `
      <tr>
        ${config.columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join("")}
        <th class="actions-col">Thao tác</th>
      </tr>
    `;
  }

  function renderFilters() {
    if (!elements.filterBar || !config.filters?.length) {
      if (elements.filterBar) elements.filterBar.innerHTML = "";
      return;
    }

    elements.filterBar.innerHTML = config.filters.map(filter => {
      const options = (filter.options || []).map(toOption);
      return `
        <label class="filter-item">
          <span>${escapeHtml(filter.label)}</span>
          <select data-filter-key="${filter.key}">
            <option value="">${escapeHtml(filter.emptyLabel || "Tất cả")}</option>
            ${options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("")}
          </select>
        </label>
      `;
    }).join("");

    $$("[data-filter-key]", elements.filterBar).forEach(select => {
      select.value = state.filters[select.dataset.filterKey] ?? "";
      select.addEventListener("change", () => {
        state.filters[select.dataset.filterKey] = select.value;
        loadData({ reset: true });
      });
    });
  }

  function renderForm() {
    releaseImagePreviews();
    state.imageStates.clear();

    elements.formGrid.innerHTML = config.fields.map(field => {
      const attrs = buildFieldAttrs(field);

      if (field.type === "textarea") {
        return `
          <label class="field ${field.full ? "field-full" : ""}">
            <span>${escapeHtml(field.label)}</span>
            <textarea name="${field.key}" ${attrs} placeholder="${escapeHtml(field.placeholder || "")}"></textarea>
          </label>
        `;
      }

      if (field.type === "checkbox") {
        return `
          <label class="field field-checkbox ${field.full ? "field-full" : ""}">
            <input type="checkbox" name="${field.key}" ${field.disabled ? "disabled" : ""}>
            <span>${escapeHtml(field.label)}</span>
          </label>
        `;
      }

      if (field.type === "select") {
        const options = (field.options || []).map(toOption);
        return `
          <label class="field ${field.full ? "field-full" : ""}">
            <span>${escapeHtml(field.label)}</span>
            <select name="${field.key}" ${buildFieldAttrs(field, { allowReadonly: false })}>
              ${options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
        `;
      }

      if (field.type === "image-source") {
        return `
          <label class="field field-image field-full" data-image-field="${field.key}">
            <span>${escapeHtml(field.label)}</span>
            <input type="text" name="${field.key}" data-image-url="${field.key}" placeholder="${escapeHtml(field.placeholder || "Dán liên kết ảnh (https://...)")}">
            <div class="image-upload-row">
              <input type="file" name="${field.key}File" data-image-file="${field.key}" accept="image/*">
              <small>Có thể dán link hoặc chọn tệp ảnh từ thiết bị. Nếu có tệp, hệ thống sẽ ưu tiên upload tệp.</small>
            </div>
            <img src="${imagePlaceholder}" alt="xem trước ảnh" class="form-image-preview" data-image-preview="${field.key}">
          </label>
        `;
      }

      return `
        <label class="field ${field.full ? "field-full" : ""}">
          <span>${escapeHtml(field.label)}</span>
          <input type="${field.type || "text"}" name="${field.key}" ${attrs} placeholder="${escapeHtml(field.placeholder || "")}">
        </label>
      `;
    }).join("");

    config.fields.filter(field => field.type === "image-source").forEach(field => {
      const wrapper = elements.formGrid.querySelector(`[data-image-field="${field.key}"]`);
      if (!wrapper) return;
      const urlInput = wrapper.querySelector(`[data-image-url="${field.key}"]`);
      const fileInput = wrapper.querySelector(`[data-image-file="${field.key}"]`);
      const preview = wrapper.querySelector(`[data-image-preview="${field.key}"]`);
      if (!urlInput || !fileInput || !preview) return;

      state.imageStates.set(field.key, { urlInput, fileInput, preview, objectUrl: null });

      const updatePreview = () => renderImagePreview(field.key);
      urlInput.addEventListener("input", () => {
        if (!fileInput.files?.length) updatePreview();
      });
      fileInput.addEventListener("change", updatePreview);
      preview.addEventListener("error", () => {
        preview.src = imagePlaceholder;
      });
      updatePreview();
    });
  }

  function clearImageObjectUrl(imageState) {
    if (!imageState?.objectUrl) return;
    URL.revokeObjectURL(imageState.objectUrl);
    imageState.objectUrl = null;
  }

  function renderImagePreview(fieldKey) {
    const imageState = state.imageStates.get(fieldKey);
    if (!imageState) return;
    clearImageObjectUrl(imageState);
    const file = imageState.fileInput.files?.[0];
    if (file) {
      imageState.objectUrl = URL.createObjectURL(file);
      imageState.preview.src = imageState.objectUrl;
      return;
    }
    imageState.preview.src = imageState.urlInput.value?.trim() || imagePlaceholder;
  }

  function releaseImagePreviews() {
    state.imageStates.forEach(imageState => clearImageObjectUrl(imageState));
  }

  function renderCell(column, value, row) {
    if (column.type === "image") {
      const src = value || column.fallback || "https://placehold.co/88x64?text=Khong+anh";
      return `<img src="${escapeHtml(src)}" alt="ảnh" class="table-image">`;
    }
    if (column.type === "badge") {
      const text = column.transform ? column.transform(value, row) : (value || "--");
      const css = column.badgeClass ? column.badgeClass(value, row) : "";
      return `<span class="badge ${css}">${escapeHtml(text)}</span>`;
    }
    if (column.type === "currency") return formatCurrency(value);
    if (column.type === "date") return formatDateTime(value);
    return escapeHtml(value ?? "--");
  }

  function renderRows() {
    if (!state.records.length) {
      renderTableEmpty(elements.tableBody, config.columns.length + 1, "Không có dữ liệu phù hợp với bộ lọc hiện tại.");
      return;
    }

    elements.tableBody.innerHTML = state.records.map(item => `
      <tr>
        ${config.columns.map(col => `<td>${renderCell(col, item[col.key], item)}</td>`).join("")}
        <td>
          <div class="table-actions">
            <button type="button" class="table-btn" data-action="edit" data-id="${item.docId}">Sửa</button>
            <button type="button" class="table-btn danger" data-action="delete" data-id="${item.docId}">Xóa</button>
          </div>
        </td>
      </tr>
    `).join("");

    $$("[data-action='edit']", elements.tableBody).forEach(btn => {
      btn.addEventListener("click", () => {
        const row = state.records.find(item => item.docId === btn.dataset.id);
        openModal(row).catch(error => {
          console.error(error);
          showToast(error?.message || "KhÃ´ng thá»ƒ má»Ÿ biá»ƒu máº«u.", "error");
        });
      });
    });

    $$("[data-action='delete']", elements.tableBody).forEach(btn => {
      btn.addEventListener("click", async () => {
        const row = state.records.find(item => item.docId === btn.dataset.id);
        const confirmed = await confirmAction({
          title: "Xác nhận xóa dữ liệu",
          message: `Bạn có chắc chắn muốn xóa "${row?.[config.deleteLabelKey || "name"] || "bản ghi này"}" không?`,
          confirmText: "Xóa",
          cancelText: "Hủy",
          danger: true
        });
        if (!confirmed) return;
        try {
          await config.service.remove(btn.dataset.id);
          showToast("Đã xóa dữ liệu.");
          await loadData({ reset: true });
        } catch (error) {
          console.error(error);
          showToast("Xóa dữ liệu thất bại.", "error");
        }
      });
    });
  }

  function renderPagination() {
    if (!elements.paginationBar) return;
    if (state.searchMode) {
      elements.paginationBar.innerHTML = `<p class="pagination-note">Đang hiển thị kết quả tìm kiếm theo từ khóa, phân trang tạm thời bị ẩn.</p>`;
      return;
    }
    elements.paginationBar.innerHTML = `
      <button type="button" class="secondary-btn" data-page-action="prev" ${state.page <= 1 ? "disabled" : ""}>Trang trước</button>
      <span class="pagination-note">Trang ${state.page}</span>
      <button type="button" class="secondary-btn" data-page-action="next" ${!state.hasNext ? "disabled" : ""}>Trang sau</button>
    `;

    const prevBtn = elements.paginationBar.querySelector("[data-page-action='prev']");
    const nextBtn = elements.paginationBar.querySelector("[data-page-action='next']");
    prevBtn?.addEventListener("click", async () => {
      if (state.page <= 1) return;
      state.currentCursor = state.cursorHistory.pop() || null;
      state.page = Math.max(1, state.page - 1);
      await loadData({ reset: false });
    });
    nextBtn?.addEventListener("click", async () => {
      if (!state.hasNext || !state.nextCursor) return;
      state.cursorHistory.push(state.currentCursor);
      state.currentCursor = state.nextCursor;
      state.page += 1;
      await loadData({ reset: false });
    });
  }

  async function loadData({ reset = false } = {}) {
    if (reset) {
      state.currentCursor = null;
      state.nextCursor = null;
      state.cursorHistory = [];
      state.page = 1;
    }

    renderTableSkeleton(elements.tableBody, config.columns.length + 1, 5);
    try {
      const result = await config.service.list({
        cursor: state.currentCursor,
        pageSize: config.pageSize || 10,
        searchKeyword: elements.searchInput?.value || "",
        filters: state.filters
      });
      state.records = result.items || [];
      state.nextCursor = result.nextCursor || null;
      state.hasNext = Boolean(result.hasNext);
      state.searchMode = Boolean(result.searchMode);
      renderRows();
      renderPagination();
    } catch (error) {
      console.error(error);
      const message = error?.message || "Không thể tải dữ liệu từ Firebase. Vui lòng thử lại.";
      renderTableEmpty(elements.tableBody, config.columns.length + 1, message);
      showToast(message, "error");
      renderPagination();
    }
  }

  function getFieldInput(fieldKey) {
    if (!elements.form) return null;
    return elements.form.querySelector(`[name="${fieldKey}"]`) || elements.form.elements[fieldKey] || null;
  }

  function fillForm(record = null, options = {}) {
    const { isEdit = false } = options;
    elements.form.reset();

    config.fields.forEach(field => {
      const input = getFieldInput(field.key);
      if (!input) return;

      if ("readOnly" in input) {
        input.readOnly = Boolean(field.readonly);
      }
      if ("disabled" in input) {
        input.disabled = Boolean(field.disabled);
      }

      if (field.readonlyOnEdit && "readOnly" in input) {
        input.readOnly = isEdit;
      }
      if (field.disabledOnEdit && "disabled" in input) {
        input.disabled = isEdit;
      }
      if (field.readonlyOnCreate && "readOnly" in input) {
        input.readOnly = !isEdit;
      }
      if (field.disabledOnCreate && "disabled" in input) {
        input.disabled = !isEdit;
      }

      const hasValue = record && Object.prototype.hasOwnProperty.call(record, field.key);
      if (field.type === "checkbox") {
        input.checked = hasValue ? Boolean(record[field.key]) : false;
      } else if (hasValue && field.type === "datetime-local") {
        input.value = toInputDateTimeLocal(record[field.key]);
      } else if (hasValue) {
        input.value = record[field.key] ?? "";
      } else if (field.defaultValue !== undefined && field.defaultValue !== null) {
        input.value = field.defaultValue;
      } else {
        input.value = "";
      }
    });

    state.imageStates.forEach(imageState => {
      imageState.fileInput.value = "";
    });
    state.imageStates.forEach((_, key) => renderImagePreview(key));
  }

  async function openModal(record = null) {
    const isEdit = Boolean(record?.docId);
    state.editingId = isEdit ? record.docId : null;

    let formRecord = record;
    if (!isEdit && typeof config.getCreateDefaults === "function") {
      formRecord = await config.getCreateDefaults({
        context: state.context
      });
    }

    elements.modal.classList.add("show");
    elements.modalTitle.textContent = isEdit ? `Chỉnh sửa ${config.title}` : `Thêm ${config.title}`;
    fillForm(formRecord, { isEdit });
  }

  function closeModal() {
    elements.modal.classList.remove("show");
    state.editingId = null;
    elements.form.reset();
    state.imageStates.forEach(imageState => {
      imageState.fileInput.value = "";
      imageState.preview.src = imagePlaceholder;
      clearImageObjectUrl(imageState);
    });
  }

  async function resolveImageFields(rawPayload) {
    for (const field of config.fields.filter(item => item.type === "image-source")) {
      const imageState = state.imageStates.get(field.key);
      const file = imageState?.fileInput?.files?.[0];
      const url = String(rawPayload[field.key] || "").trim();

      if (file) {
        const valid = validateImageFile(file);
        if (!valid.valid) throw new Error(valid.message);
        setButtonLoading(elements.saveBtn, true, "Đang tải ảnh...");
        rawPayload[field.key] = await uploadImageToStorage(file, {
          bucket: config.collectionName,
          field: field.key,
          recordId: state.editingId || rawPayload.id || "new"
        });
      } else {
        rawPayload[field.key] = url;
      }

      if (field.required && !rawPayload[field.key]) {
        throw new Error(`Vui lòng cung cấp ảnh cho trường "${field.label}".`);
      }
    }
  }

  function collectRawPayload() {
    const raw = {};
    config.fields.forEach(field => {
      const input = getFieldInput(field.key);
      if (!input) return;
      raw[field.key] = field.type === "checkbox" ? input.checked : input.value;
    });
    return raw;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setButtonLoading(elements.saveBtn, true, "Đang lưu...");

    try {
      const raw = collectRawPayload();
      await resolveImageFields(raw);

      const payload = config.normalizePayload
        ? await config.normalizePayload(raw, { editingId: state.editingId, context: state.context })
        : raw;

      if (state.editingId) {
        await config.service.update(state.editingId, payload);
        showToast("Đã cập nhật dữ liệu.");
      } else {
        const customId = config.getCustomId ? config.getCustomId(payload) : null;
        await config.service.create(payload, customId);
        showToast("Đã thêm dữ liệu mới.");
      }

      closeModal();
      await loadData({ reset: true });
    } catch (error) {
      console.error(error);
      showToast(error?.message || "Lưu dữ liệu thất bại.", "error");
    } finally {
      setButtonLoading(elements.saveBtn, false);
    }
  }

  return {
    reload: () => loadData({ reset: true }),
    setContext(nextContext = {}) {
      state.context = { ...state.context, ...nextContext };
      renderFilters();
      renderForm();
      loadData({ reset: true });
    }
  };
}
