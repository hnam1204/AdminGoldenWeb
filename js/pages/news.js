import { initCollectionPage } from "./collection-page.js";
import { createNews, listNews, removeNews, updateNews } from "../services/news-service.js";

initCollectionPage({
  navKey: "news",
  title: "Tin tức",
  caption: "Quản lý bài viết, sự kiện và chương trình khuyến mãi.",
  collectionName: "news",
  pageSize: 10,
  searchPlaceholder: "Tìm theo tiêu đề bài viết...",
  filters: [
    {
      key: "type",
      label: "Loại tin",
      options: [
        { value: "event", label: "Sự kiện" },
        { value: "promotion", label: "Khuyến mãi" },
        { value: "news", label: "Tin tức" }
      ]
    }
  ],
  columns: [
    { key: "imageUrl", label: "Ảnh", type: "image" },
    { key: "title", label: "Tiêu đề" },
    {
      key: "type",
      label: "Loại tin",
      type: "badge",
      transform: value => ({ event: "Sự kiện", promotion: "Khuyến mãi", news: "Tin tức" }[value] || value || "--"),
      badgeClass: value => ({ event: "warning", promotion: "success", news: "" }[value] || "")
    },
    { key: "description", label: "Mô tả" },
    { key: "date", label: "Ngày đăng", type: "date" }
  ],
  fields: [
    { key: "title", label: "Tiêu đề", type: "text", required: true },
    { key: "description", label: "Mô tả ngắn", type: "textarea", required: true },
    { key: "content", label: "Nội dung", type: "textarea", required: true, full: true },
    { key: "imageUrl", label: "Ảnh bài viết", type: "image-source", required: true, full: true },
    {
      key: "type",
      label: "Loại tin",
      type: "select",
      required: true,
      options: [
        { value: "event", label: "Sự kiện" },
        { value: "promotion", label: "Khuyến mãi" },
        { value: "news", label: "Tin tức" }
      ]
    },
    { key: "date", label: "Ngày đăng", type: "datetime-local" }
  ],
  service: {
    list: listNews,
    create: createNews,
    update: updateNews,
    remove: removeNews
  },
  normalizePayload(raw) {
    return {
      title: raw.title || "",
      description: raw.description || "",
      content: raw.content || "",
      imageUrl: raw.imageUrl || "",
      type: raw.type || "news",
      date: raw.date ? new Date(raw.date) : new Date()
    };
  }
});
