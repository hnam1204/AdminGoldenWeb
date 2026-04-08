import { fetchPage, searchByFields } from "./firestore-query.js";
import { createDoc, removeDocById, updateDocById } from "./service-helpers.js";

const COLLECTION = "banners";
const ORDER_BY = "title";
const ORDER_DIRECTION = "asc";

export async function listBanners(params = {}) {
  const {
    cursor = null,
    pageSize = 10,
    searchKeyword = ""
  } = params;

  if (searchKeyword) {
    const result = await searchByFields({
      collectionName: COLLECTION,
      keyword: searchKeyword,
      fields: ["title"],
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
    cursor
  });
  return { ...result, searchMode: false };
}

export async function createBanner(payload) {
  return createDoc(COLLECTION, payload);
}

export async function updateBanner(id, payload) {
  return updateDocById(COLLECTION, id, payload);
}

export async function removeBanner(id) {
  return removeDocById(COLLECTION, id);
}
