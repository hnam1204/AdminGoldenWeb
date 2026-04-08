import { initCollectionPage } from "./collection-page.js";
import {
  createProduct,
  listProductCategories,
  listProducts,
  removeProduct,
  updateProduct
} from "../services/product-service.js";
import { parseBoolean, parseInteger, parseNumber, validateCategoryId } from "../utils/validators.js";

async function bootstrapProductsPage() {
  const categories = await listProductCategories();
  const categoryOptions = categories
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi"))
    .map(item => ({ value: String(item.id), label: `${item.name} (${item.id})` }));

  initCollectionPage({
    navKey: "products",
    title: "Sản phẩm",
    caption: "Quản lý thông tin sản phẩm, danh mục và trạng thái mở bán.",
    collectionName: "products",
    pageSize: 10,
    searchPlaceholder: "Tìm theo tên sản phẩm...",
    context: { categories },
    filters: [
      {
        key: "categoryId",
        label: "Danh mục",
        options: categoryOptions
      },
      {
        key: "isAvailable",
        label: "Trạng thái",
        options: [
          { value: "true", label: "Đang bán" },
          { value: "false", label: "Ngưng bán" }
        ]
      }
    ],
    columns: [
      { key: "id", label: "Mã ID" },
      { key: "imageUrl", label: "Ảnh", type: "image" },
      { key: "name", label: "Tên sản phẩm" },
      { key: "categoryName", label: "Danh mục" },
      { key: "price", label: "Giá bán", type: "currency" },
      {
        key: "isAvailable",
        label: "Trạng thái",
        type: "badge",
        transform: value => value ? "Đang bán" : "Ngưng bán",
        badgeClass: value => value ? "success" : "danger"
      },
      { key: "createdAt", label: "Ngày tạo", type: "date" }
    ],
    fields: [
      { key: "id", label: "Mã ID", type: "number", required: true },
      { key: "name", label: "Tên sản phẩm", type: "text", required: true },
      { key: "description", label: "Mô tả", type: "textarea", required: true, full: true },
      { key: "price", label: "Giá bán", type: "number", required: true },
      { key: "categoryId", label: "Danh mục", type: "select", required: true, options: categoryOptions },
      { key: "imageUrl", label: "Ảnh sản phẩm", type: "image-source", required: true, full: true },
      { key: "isAvailable", label: "Đang bán", type: "checkbox", full: true }
    ],
    service: {
      list: listProducts,
      create: createProduct,
      update: updateProduct,
      remove: removeProduct
    },
    normalizePayload(raw, { context }) {
      const categoryId = parseInteger(raw.categoryId, 0);
      const categoryCheck = validateCategoryId(categoryId, context.categories);
      if (!categoryCheck.valid) throw new Error(categoryCheck.message);

      const selectedCategory = context.categories.find(item => parseInteger(item.id, 0) === categoryId);
      return {
        id: parseInteger(raw.id, 0),
        name: raw.name || "",
        description: raw.description || "",
        price: parseNumber(raw.price, 0),
        imageUrl: raw.imageUrl || "",
        categoryId,
        categoryName: selectedCategory?.name || "",
        categoryKey: selectedCategory?.key || "",
        isAvailable: parseBoolean(raw.isAvailable)
      };
    }
  });
}

bootstrapProductsPage().catch(error => {
  console.error(error);
});
