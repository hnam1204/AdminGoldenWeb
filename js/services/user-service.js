import {
  db,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "../firebase/firebase-firestore.js";
import { ensureAnonymousAuth } from "../firebase/firebase-auth.js";
import { fetchPage, searchByFields } from "./firestore-query.js";
import { createDoc, removeDocById } from "./service-helpers.js";
import { parseInteger } from "../utils/validators.js";

const COLLECTION = "users";
const ORDER_BY = "createdAt";
const ORDER_DIRECTION = "desc";

/*
  Firestore index guidance (production):
  1) users.createdAt (single/composite for ordering)
  2) users.role + users.createdAt (filter + orderBy)
*/

export async function listUsers(params = {}) {
  const {
    cursor = null,
    pageSize = 10,
    searchKeyword = "",
    filters = {}
  } = params;

  const whereFilters = [];
  if (filters.role) {
    whereFilters.push({ field: "role", op: "==", value: filters.role });
  }

  if (searchKeyword) {
    const result = await searchByFields({
      collectionName: COLLECTION,
      keyword: searchKeyword,
      fields: ["fullName", "email"],
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

function normalizeUserPayload(payload) {
  return {
    id: payload.id || "",
    fullName: payload.fullName || "",
    email: payload.email || "",
    phone: payload.phone || "",
    address: payload.address || "",
    avatar: payload.avatar || "",
    role: payload.role || "customer",
    points: parseInteger(payload.points, 0)
  };
}

export async function createUser(payload) {
  const user = normalizeUserPayload(payload);
  if (!user.id) throw new Error("Mã người dùng (UID) là bắt buộc.");
  return createDoc(COLLECTION, { ...user, createdAt: serverTimestamp() }, user.id);
}

export async function updateUser(id, payload) {
  await ensureAnonymousAuth();
  const user = normalizeUserPayload(payload);
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  const current = snap.exists() ? snap.data() : null;
  const createdAtPatch = (!current?.createdAt || typeof current.createdAt === "number")
    ? { createdAt: serverTimestamp() }
    : {};
  return updateDoc(ref, { ...user, ...createdAtPatch, updatedAt: serverTimestamp() });
}

export async function removeUser(id) {
  return removeDocById(COLLECTION, id);
}
