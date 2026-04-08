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
import { parseBoolean, parseInteger, parseNumber } from "../utils/validators.js";
import { fetchPage, searchByFields } from "./firestore-query.js";
import { createDoc, removeDocById, updateDocById } from "./service-helpers.js";

const COLLECTION = "orders";
const ORDER_BY = "date";
const ORDER_DIRECTION = "desc";

/*
  Firestore index guidance (production):
  1) orders.date (single/composite for ordering)
  2) orders.status + orders.date (filter + orderBy)
  3) orders.customerName + orders.date (search + order)
*/

function normalizeProductSnapshot(product = {}, fallback = {}) {
  const categoryId = parseInteger(product.categoryId ?? fallback.categoryId, 0);
  return {
    id: parseInteger(product.id ?? fallback.id, 0),
    name: product.name || fallback.name || "",
    price: parseNumber(product.price ?? fallback.price, 0),
    imageUrl: product.imageUrl || fallback.imageUrl || "",
    categoryId,
    categoryName: product.categoryName || fallback.categoryName || "",
    categoryKey: product.categoryKey || fallback.categoryKey || "",
    description: product.description || fallback.description || "",
    isAvailable: parseBoolean(product.isAvailable ?? product.available ?? fallback.isAvailable ?? fallback.available),
    rating: parseNumber(product.rating ?? fallback.rating, 0)
  };
}

function normalizeOrderItem(item = {}) {
  const product = normalizeProductSnapshot(item.product || {}, item);
  // Chuẩn hóa về schema mới:
  // { product: {...}, quantity, size, sugar, ice, topping, note, totalPrice }
  return {
    product,
    quantity: parseInteger(item.quantity, 0),
    size: item.size || "",
    sugar: item.sugar || "",
    ice: item.ice || "",
    topping: item.topping ?? null,
    note: item.note || "",
    totalPrice: parseNumber(item.totalPrice, product.price * parseInteger(item.quantity, 0))
  };
}

async function ensureProductCategorySnapshot(productSnapshot) {
  if (productSnapshot.categoryId) return productSnapshot;
  if (!productSnapshot.id) return productSnapshot;

  await ensureAnonymousAuth();
  const q = query(collection(db, "products"), where("id", "==", productSnapshot.id), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return productSnapshot;

  const source = snap.docs[0].data();
  return {
    ...productSnapshot,
    categoryId: parseInteger(source.categoryId, productSnapshot.categoryId),
    categoryName: source.categoryName || productSnapshot.categoryName,
    categoryKey: source.categoryKey || productSnapshot.categoryKey,
    isAvailable: parseBoolean(source.isAvailable ?? source.available ?? productSnapshot.isAvailable)
  };
}

export function normalizeOrderForView(order = {}) {
  const items = Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [];
  return {
    ...order,
    items,
    totalPrice: parseNumber(order.totalPrice, items.reduce((sum, item) => sum + item.totalPrice, 0))
  };
}

async function normalizeOrderPayload(payload = {}) {
  const sourceItems = Array.isArray(payload.items) ? payload.items : [];
  const items = await Promise.all(sourceItems.map(async item => {
    const normalized = normalizeOrderItem(item);
    return {
      ...normalized,
      product: await ensureProductCategorySnapshot(normalized.product)
    };
  }));
  return {
    orderId: payload.orderId || "",
    userId: payload.userId || "",
    customerName: payload.customerName || "",
    customerPhone: payload.customerPhone || "",
    deliveryAddress: payload.deliveryAddress || "",
    status: payload.status || "pending",
    paymentMethod: payload.paymentMethod || "cash",
    date: payload.date || new Date(),
    totalPrice: parseNumber(payload.totalPrice, items.reduce((sum, item) => sum + item.totalPrice, 0)),
    items
  };
}

export async function listOrders(params = {}) {
  const {
    cursor = null,
    pageSize = 10,
    searchKeyword = "",
    filters = {}
  } = params;

  const whereFilters = [];
  if (filters.status) {
    whereFilters.push({ field: "status", op: "==", value: filters.status });
  }

  if (searchKeyword) {
    const result = await searchByFields({
      collectionName: COLLECTION,
      keyword: searchKeyword,
      fields: ["orderId", "customerName"],
      filters: whereFilters,
      pageSize,
      orderByField: ORDER_BY,
      orderDirection: ORDER_DIRECTION
    });
    return {
      ...result,
      items: result.items.map(normalizeOrderForView),
      nextCursor: null,
      searchMode: true
    };
  }

  const result = await fetchPage({
    collectionName: COLLECTION,
    orderByField: ORDER_BY,
    orderDirection: ORDER_DIRECTION,
    pageSize,
    cursor,
    filters: whereFilters
  });
  return {
    ...result,
    items: result.items.map(normalizeOrderForView),
    searchMode: false
  };
}

export async function createOrder(payload) {
  const order = await normalizeOrderPayload(payload);
  return createDoc(COLLECTION, { ...order, createdAt: serverTimestamp() });
}

export async function updateOrder(id, payload) {
  const order = await normalizeOrderPayload(payload);
  return updateDocById(COLLECTION, id, order);
}

export async function updateOrderStatus(id, status) {
  return updateDocById(COLLECTION, id, { status, updatedAt: serverTimestamp() });
}

export async function removeOrder(id) {
  return removeDocById(COLLECTION, id);
}
