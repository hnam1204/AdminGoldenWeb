import { initCollectionPage } from "./collection-page.js";
import {
  createBanner,
  generateRandomBannerId,
  listBanners,
  removeBanner,
  updateBanner
} from "../services/banner-service.js";
import { parseInteger } from "../utils/validators.js";

initCollectionPage({
  navKey: "banners",
  title: "Biểu ngữ",
  caption: "Quản lý nội dung hiển thị ở màn hình chính ứng dụng.",
  collectionName: "banners",
  pageSize: 8,
  searchPlaceholder: "Tìm theo tiêu đề biểu ngữ...",
  columns: [
    { key: "imageUrl", label: "Ảnh", type: "image" },
    { key: "title", label: "Tiêu đề" },
    { key: "desc", label: "Mô tả" }
  ],
  fields: [
    { key: "id", label: "Mã ID", type: "number", required: true, readonly: true, disabled: true },
    { key: "title", label: "Tiêu đề", type: "text", required: true },
    { key: "desc", label: "Mô tả", type: "textarea" },
    { key: "imageUrl", label: "Ảnh biểu ngữ", type: "image-source", required: true, full: true }
  ],
  service: {
    list: listBanners,
    create: createBanner,
    update: updateBanner,
    remove: removeBanner
  },
  async getCreateDefaults() {
    return {
      id: await generateRandomBannerId()
    };
  },
  async normalizePayload(raw, { editingId }) {
    let id = parseInteger(raw.id, 0);
    if (!id) {
      if (!editingId) {
        throw new Error("Không thể tạo Mã ID biểu ngữ.");
      }
      id = await generateRandomBannerId();
    }

    const title = String(raw.title ?? raw.name ?? "").trim();
    if (!title) {
      throw new Error("Tiêu đề không được để trống.");
    }

    return {
      id,
      title,
      desc: String(raw.desc || "").trim(),
      imageUrl: String(raw.imageUrl || "").trim()
    };
  }
});
