import { initCollectionPage } from "./collection-page.js";
import { createUser, listUsers, removeUser, updateUser } from "../services/user-service.js";
import { parseInteger } from "../utils/validators.js";

initCollectionPage({
  navKey: "users",
  title: "Người dùng",
  caption: "Quản lý tài khoản, vai trò, điểm tích lũy và thông tin liên hệ.",
  collectionName: "users",
  pageSize: 10,
  searchPlaceholder: "Tìm theo họ tên hoặc email...",
  filters: [
    {
      key: "role",
      label: "Vai trò",
      options: [
        { value: "customer", label: "Khách hàng" },
        { value: "admin", label: "Quản trị viên" }
      ]
    }
  ],
  columns: [
    { key: "avatar", label: "Ảnh đại diện", type: "image", fallback: "https://placehold.co/80x56?text=Avatar" },
    { key: "fullName", label: "Họ tên" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Điện thoại" },
    {
      key: "role",
      label: "Vai trò",
      type: "badge",
      transform: value => value === "admin" ? "Quản trị viên" : "Khách hàng",
      badgeClass: value => value === "admin" ? "warning" : ""
    },
    { key: "points", label: "Điểm" },
    { key: "createdAt", label: "Ngày tạo", type: "date" }
  ],
  fields: [
    { key: "id", label: "Mã người dùng (UID)", type: "text", required: true, readonlyOnEdit: true },
    { key: "fullName", label: "Họ tên", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "phone", label: "Điện thoại", type: "text" },
    { key: "address", label: "Địa chỉ", type: "text" },
    { key: "avatar", label: "Ảnh đại diện", type: "image-source", full: true },
    {
      key: "role",
      label: "Vai trò",
      type: "select",
      required: true,
      options: [
        { value: "customer", label: "Khách hàng" },
        { value: "admin", label: "Quản trị viên" }
      ]
    },
    { key: "points", label: "Điểm", type: "number" }
  ],
  service: {
    list: listUsers,
    create: createUser,
    update: updateUser,
    remove: removeUser
  },
  normalizePayload(raw) {
    return {
      id: raw.id || "",
      fullName: raw.fullName || "",
      email: raw.email || "",
      phone: raw.phone || "",
      address: raw.address || "",
      avatar: raw.avatar || "",
      role: raw.role || "customer",
      points: parseInteger(raw.points, 0)
    };
  }
});
