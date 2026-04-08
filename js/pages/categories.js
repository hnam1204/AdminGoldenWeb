import { initCollectionPage } from "./collection-page.js";
import { createCategory, listCategories, removeCategory, updateCategory } from "../services/category-service.js";
import { parseBoolean, parseInteger } from "../utils/validators.js";

initCollectionPage({
  navKey: "categories",
  title: "Danh mục",
  caption: "Quản lý nhóm sản phẩm, trạng thái hoạt động và khóa phân loại.",
  collectionName: "categories",
  pageSize: 10,
  searchPlaceholder: "Tìm theo tên danh mục hoặc mã danh mục...",
  filters: [
    {
      key: "isActive",
      label: "Trạng thái",
      options: [
        { value: "true", label: "Đang hoạt động" },
        { value: "false", label: "Không hoạt động" }
      ]
    }
  ],
  columns: [
    { key: "id", label: "Mã ID" },
    { key: "imageUrl", label: "Ảnh", type: "image" },
    { key: "name", label: "Tên danh mục" },
    { key: "key", label: "Mã danh mục" },
    {
      key: "isActive",
      label: "Trạng thái",
      type: "badge",
      transform: value => value ? "Đang hoạt động" : "Không hoạt động",
      badgeClass: value => value ? "success" : "danger"
    },
    { key: "createdAt", label: "Ngày tạo", type: "date" }
  ],
  fields: [
    { key: "id", label: "Mã ID", type: "number", required: true },
    { key: "name", label: "Tên danh mục", type: "text", required: true },
    { key: "key", label: "Mã danh mục", type: "text", required: true },
    { key: "imageUrl", label: "Ảnh danh mục", type: "image-source", required: true, full: true },
    { key: "isActive", label: "Đang hoạt động", type: "checkbox", full: true }
  ],
  service: {
    list: listCategories,
    create: createCategory,
    update: updateCategory,
    remove: removeCategory
  },
  normalizePayload(raw) {
    return {
      id: parseInteger(raw.id, 0),
      name: raw.name || "",
      key: raw.key || "",
      imageUrl: raw.imageUrl || "",
      isActive: parseBoolean(raw.isActive)
    };
  }
});
