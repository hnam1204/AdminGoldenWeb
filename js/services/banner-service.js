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
import { fetchPage, searchByFields } from "./firestore-query.js";
import { createDoc, removeDocById, updateDocById } from "./service-helpers.js";

const COLLECTION = "banners";
const ORDER_BY = "title";
const ORDER_DIRECTION = "asc";
const ID_MIN = 100000;
const ID_MAX = 999999;
const ID_RETRY = 25;

function parseBannerId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function normalizeBannerRecord(item = {}) {
  const parsedId = parseBannerId(item.id);
  return {
    ...item,
    id: parsedId > 0 ? parsedId : "",
    title: String(item.title ?? item.name ?? "").trim(),
    desc: String(item.desc ?? item.description ?? "").trim(),
    imageUrl: String(item.imageUrl || "").trim()
  };
}

function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function bannerIdExists(id) {
  await ensureAnonymousAuth();
  const q = query(collection(db, COLLECTION), where("id", "==", id), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

function toSafeRange(min = ID_MIN, max = ID_MAX) {
  const safeMin = Number.isFinite(Number(min)) ? Math.trunc(Number(min)) : ID_MIN;
  const safeMax = Number.isFinite(Number(max)) ? Math.trunc(Number(max)) : ID_MAX;
  if (safeMin >= safeMax) return { min: ID_MIN, max: ID_MAX };
  return { min: safeMin, max: safeMax };
}

export async function generateRandomBannerId(options = {}) {
  const { attempts = ID_RETRY, min = ID_MIN, max = ID_MAX } = options;
  const safeAttempts = Number.isFinite(Number(attempts)) ? Math.max(5, Math.trunc(Number(attempts))) : ID_RETRY;
  const range = toSafeRange(min, max);

  for (let i = 0; i < safeAttempts; i += 1) {
    const candidate = randomIntInclusive(range.min, range.max);
    // Best effort uniqueness by checking current Firestore values.
    if (!(await bannerIdExists(candidate))) {
      return candidate;
    }
  }

  let fallback = parseBannerId(String(Date.now()).slice(-6));
  if (!fallback) fallback = range.min;
  fallback = Math.max(range.min, Math.min(range.max, fallback));

  for (let offset = 0; offset <= range.max - range.min; offset += 1) {
    const candidate = fallback + offset > range.max
      ? range.min + ((fallback + offset) - range.max - 1)
      : fallback + offset;
    if (!(await bannerIdExists(candidate))) {
      return candidate;
    }
  }

  throw new Error("KhÃ´ng thá»ƒ táº¡o MÃ£ ID biá»ƒu ngá»¯ duy nháº¥t. Vui lÃ²ng thá»­ láº¡i.");
}

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
      fields: ["title", "name"],
      pageSize,
      orderByField: ORDER_BY,
      orderDirection: ORDER_DIRECTION
    });
    return {
      ...result,
      items: (result.items || []).map(normalizeBannerRecord),
      nextCursor: null,
      searchMode: true
    };
  }

  const result = await fetchPage({
    collectionName: COLLECTION,
    orderByField: ORDER_BY,
    orderDirection: ORDER_DIRECTION,
    pageSize,
    cursor
  });
  return {
    ...result,
    items: (result.items || []).map(normalizeBannerRecord),
    searchMode: false
  };
}

export async function createBanner(payload) {
  const normalized = normalizeBannerRecord(payload);
  return createDoc(COLLECTION, { ...normalized, createdAt: serverTimestamp() });
}

export async function updateBanner(id, payload) {
  const normalized = normalizeBannerRecord(payload);
  return updateDocById(COLLECTION, id, normalized);
}

export async function removeBanner(id) {
  return removeDocById(COLLECTION, id);
}
