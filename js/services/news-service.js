import { serverTimestamp } from "../firebase/firebase-firestore.js";
import { fetchPage, searchByFields } from "./firestore-query.js";
import { createDoc, removeDocById, updateDocById } from "./service-helpers.js";

const COLLECTION = "news";
const ORDER_BY = "date";
const ORDER_DIRECTION = "desc";

export async function listNews(params = {}) {
  const {
    cursor = null,
    pageSize = 10,
    searchKeyword = "",
    filters = {}
  } = params;

  const whereFilters = [];
  if (filters.type) {
    whereFilters.push({ field: "type", op: "==", value: filters.type });
  }

  if (searchKeyword) {
    const result = await searchByFields({
      collectionName: COLLECTION,
      keyword: searchKeyword,
      fields: ["title"],
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

export async function createNews(payload) {
  const safePayload = {
    ...payload,
    date: payload.date || new Date(),
    createdAt: serverTimestamp()
  };
  return createDoc(COLLECTION, safePayload);
}

export async function updateNews(id, payload) {
  return updateDocById(COLLECTION, id, payload);
}

export async function removeNews(id) {
  return removeDocById(COLLECTION, id);
}
