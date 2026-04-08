import {
  collection,
  db,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where
} from "../firebase/firebase-firestore.js";
import { ensureAnonymousAuth } from "../firebase/firebase-auth.js";
import { parseInteger, parseNumber } from "../utils/validators.js";
import { fetchPage, searchByFields } from "./firestore-query.js";
import { createDoc, removeDocById, updateDocById } from "./service-helpers.js";

const COLLECTION = "products";
const ORDER_BY = "createdAt";
const ORDER_DIRECTION = "desc";

/*
  Firestore index guidance (production):
  1) products.createdAt (single-field or composite for ordering)
  2) products.categoryId + products.createdAt (filter + orderBy)
  3) products.isAvailable + products.createdAt (filter + orderBy)
*/

export async function listProducts(params = {}) {
  const {
    cursor = null,
    pageSize = 10,
    searchKeyword = "",
    filters = {}
  } = params;

  const whereFilters = [];
  if (filters.categoryId) {
    whereFilters.push({ field: "categoryId", op: "==", value: parseInteger(filters.categoryId, 0) });
  }
  if (filters.isAvailable !== "" && filters.isAvailable !== undefined) {
    whereFilters.push({ field: "isAvailable", op: "==", value: filters.isAvailable === "true" });
  }

  if (searchKeyword) {
    const result = await searchByFields({
      collectionName: COLLECTION,
      keyword: searchKeyword,
      fields: ["name"],
      filters: whereFilters,
      pageSize,
      orderByField: ORDER_BY,
      orderDirection: ORDER_DIRECTION
    });
    return { ...result, nextCursor: null, searchMode: true };
  }

  const result = await fetchPage({
    collectionName: COLLECTION,
    orderByField: ORDER_BY,
    orderDirection: ORDER_DIRECTION,
    pageSize,
    cursor,
    filters: whereFilters
  });
  return { ...result, searchMode: false };
}

export async function listProductCategories() {
  await ensureAnonymousAuth();
  const q = query(collection(db, "categories"), where("isActive", "==", true));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs.map(docSnap => ({ docId: docSnap.id, ...docSnap.data() }));
  }
  // Fallback tương thích dữ liệu cũ khi categories chưa có field isActive.
  const fallback = await getDocs(collection(db, "categories"));
  return fallback.docs.map(docSnap => ({ docId: docSnap.id, ...docSnap.data() }));
}

async function findCategoryById(categoryId) {
  await ensureAnonymousAuth();
  const q = query(collection(db, "categories"), where("id", "==", categoryId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const item = snap.docs[0];
  return { docId: item.id, ...item.data() };
}

async function normalizeProductPayload(payload) {
  const categoryId = parseInteger(payload.categoryId, 0);
  if (!categoryId) {
    throw new Error("Danh mục sản phẩm không hợp lệ. Vui lòng chọn đúng danh mục.");
  }

  const product = {
    id: parseInteger(payload.id, 0),
    name: payload.name || "",
    description: payload.description || "",
    price: parseNumber(payload.price, 0),
    imageUrl: payload.imageUrl || "",
    categoryId,
    categoryName: payload.categoryName || "",
    categoryKey: payload.categoryKey || "",
    isAvailable: payload.isAvailable === true || payload.isAvailable === "true"
  };

  const category = await findCategoryById(categoryId);
  if (category) {
    product.categoryName = category.name || product.categoryName;
    product.categoryKey = category.key || product.categoryKey;
  }
  return product;
}

export async function createProduct(payload) {
  const product = await normalizeProductPayload(payload);
  return createDoc(COLLECTION, { ...product, createdAt: serverTimestamp() });
}

export async function updateProduct(id, payload) {
  const product = await normalizeProductPayload(payload);
  return updateDocById(COLLECTION, id, product);
}

export async function removeProduct(id) {
  return removeDocById(COLLECTION, id);
}
