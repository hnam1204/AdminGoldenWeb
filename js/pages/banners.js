import { initCollectionPage } from "./collection-page.js";
import { createBanner, listBanners, removeBanner, updateBanner } from "../services/banner-service.js";

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
  normalizePayload(raw) {
    return {
      title: raw.title || "",
      desc: raw.desc || "",
      imageUrl: raw.imageUrl || ""
    };
  }
});
