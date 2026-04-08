export const schemas = {
  banners: {
    title: "Banner",
    collection: "banners",
    orderByField: null,
    columns: [
      { key: "imageUrl", label: "Ảnh", type: "image" },
      { key: "title", label: "Tiêu đề" },
      { key: "desc", label: "Mô tả" }
    ],
    form: [
      { key: "title", label: "Tiêu đề", type: "text", required: true },
      { key: "desc", label: "Mô tả", type: "textarea" },
      { key: "imageUrl", label: "Ảnh", type: "image-source", required: true }
    ]
  },
  categories: {
    title: "Danh mục",
    collection: "categories",
    orderByField: "id",
    orderDirection: "asc",
    columns: [
      { key: "id", label: "ID" },
      { key: "imageUrl", label: "Ảnh", type: "image" },
      { key: "name", label: "Tên danh mục" },
      { key: "key", label: "Key" },
      { key: "isActive", label: "Trạng thái", type: "badge", transform: value => value ? "Đang hoạt động" : "Tạm ẩn" },
      { key: "createdAt", label: "Ngày tạo", type: "date" }
    ],
    form: [
      { key: "id", label: "ID", type: "number", required: true },
      { key: "name", label: "Tên danh mục", type: "text", required: true },
      { key: "key", label: "Key", type: "text", required: true },
      { key: "imageUrl", label: "Ảnh", type: "image-source", required: true },
      { key: "isActive", label: "Đang hoạt động", type: "checkbox" }
    ]
  },
  news: {
    title: "Tin tức",
    collection: "news",
    orderByField: "date",
    columns: [
      { key: "imageUrl", label: "Ảnh", type: "image" },
      { key: "title", label: "Tiêu đề" },
      { key: "type", label: "Loại", type: "badge" },
      { key: "description", label: "Mô tả" },
      { key: "date", label: "Ngày đăng", type: "date" }
    ],
    form: [
      { key: "title", label: "Tiêu đề", type: "text", required: true },
      { key: "description", label: "Mô tả ngắn", type: "textarea", required: true },
      { key: "content", label: "Nội dung", type: "textarea", required: true },
      { key: "imageUrl", label: "Ảnh", type: "image-source", required: true },
      { key: "type", label: "Loại", type: "select", options: ["event", "promotion", "news"], required: true },
      { key: "date", label: "Ngày đăng", type: "datetime-local" }
    ]
  },
  products: {
    title: "Sản phẩm",
    collection: "products",
    orderByField: "id",
    orderDirection: "asc",
    columns: [
      { key: "id", label: "ID" },
      { key: "imageUrl", label: "Ảnh", type: "image" },
      { key: "name", label: "Tên sản phẩm" },
      { key: "categoryName", label: "Danh mục" },
      { key: "price", label: "Giá", type: "currency" },
      { key: "isAvailable", label: "Trạng thái", type: "badge", transform: value => value ? "Đang bán" : "Tạm dừng" },
      { key: "createdAt", label: "Ngày tạo", type: "date" }
    ],
    form: [
      { key: "id", label: "ID", type: "number", required: true },
      { key: "name", label: "Tên sản phẩm", type: "text", required: true },
      { key: "description", label: "Mô tả", type: "textarea", required: true },
      { key: "price", label: "Giá", type: "number", required: true },
      { key: "imageUrl", label: "Ảnh", type: "image-source", required: true },
      { key: "categoryId", label: "Category ID", type: "number", required: true },
      { key: "categoryName", label: "Tên danh mục", type: "text", required: true },
      { key: "categoryKey", label: "Category Key", type: "text", required: true },
      { key: "isAvailable", label: "Đang bán", type: "checkbox" }
    ]
  },
  users: {
    title: "Người dùng",
    collection: "users",
    orderByField: null,
    columns: [
      { key: "avatar", label: "Avatar", type: "image" },
      { key: "fullName", label: "Họ tên" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Điện thoại" },
      { key: "role", label: "Vai trò", type: "badge" },
      { key: "points", label: "Điểm" },
      { key: "createdAt", label: "Ngày tạo", type: "date" }
    ],
    form: [
      { key: "id", label: "UID", type: "text", required: true },
      { key: "fullName", label: "Họ tên", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Điện thoại", type: "text" },
      { key: "address", label: "Địa chỉ", type: "text" },
      { key: "avatar", label: "Avatar", type: "image-source" },
      { key: "role", label: "Vai trò", type: "select", options: ["customer", "admin"], required: true },
      { key: "points", label: "Điểm", type: "number" }
    ]
  }
};
