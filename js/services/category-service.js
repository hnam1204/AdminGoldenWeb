import { collection, db, getDocs, query, serverTimestamp, where } from "../firebase/firebase-firestore.js";
import { ensureAnonymousAuth } from "../firebase/firebase-auth.js";
import { fetchPage, searchByFields } from "./firestore-query.js";
import { createDoc, removeDocById, updateDocById } from "./service-helpers.js";

const COLLECTION = "categories";
const ORDER_BY = "createdAt";
const ORDER_DIRECTION = "desc";

export async function listCategories(params = {}) {
  const {
    cursor = null,
    pageSize = 10,
    searchKeyword = "",
    filters = {}
  } = params;

  const whereFilters = [];
  if (filters.isActive !== "" && filters.isActive !== undefined) {
    whereFilters.push({ field: "isActive", op: "==", value: filters.isActive === "true" });
  }

  if (searchKeyword) {
    const result = await searchByFields({
      collectionName: COLLECTION,
      keyword: searchKeyword,
      fields: ["name", "key"],
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

export async function listActiveCategories() {
  await ensureAnonymousAuth();
  const q = query(collection(db, COLLECTION), where("isActive", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map(docSnap => ({ docId: docSnap.id, ...docSnap.data() }));
}

export async function createCategory(payload) {
  return createDoc(COLLECTION, { ...payload, createdAt: serverTimestamp() });
}

export async function updateCategory(id, payload) {
  return updateDocById(COLLECTION, id, payload);
}

export async function removeCategory(id) {
  return removeDocById(COLLECTION, id);
}
