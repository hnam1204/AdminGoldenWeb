import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where
} from "../firebase/firebase-firestore.js";
import { db } from "../firebase/firebase-firestore.js";
import { ensureAnonymousAuth } from "../firebase/firebase-auth.js";

function toData(snapshot) {
  return snapshot.docs.map(docSnap => ({ docId: docSnap.id, ...docSnap.data() }));
}

function buildWhereClauses(constraints = []) {
  return constraints
    .filter(item => item && item.field && item.op && item.value !== undefined && item.value !== null && item.value !== "")
    .map(item => where(item.field, item.op, item.value));
}

function toComparable(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number" || typeof value === "string") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  return String(value);
}

function getErrorCode(error) {
  return String(error?.code || "").replace("firestore/", "");
}

function isPermissionError(error) {
  const code = getErrorCode(error);
  const message = String(error?.message || "");
  return code === "permission-denied" || /insufficient permissions/i.test(message);
}

function isTransientNetworkError(error) {
  const code = getErrorCode(error);
  const message = String(error?.message || "");
  return code === "unavailable" || code === "deadline-exceeded" || /network|offline|backend/i.test(message);
}

function isQueryIndexError(error) {
  const code = getErrorCode(error);
  const message = String(error?.message || "");
  return code === "failed-precondition" || code === "invalid-argument" || /index/i.test(message);
}

function toReadableError(error, fallbackMessage) {
  if (isPermissionError(error)) {
    return new Error("Không có quyền đọc dữ liệu Firestore. Vui lòng kiểm tra Security Rules hoặc đăng nhập.");
  }
  if (isTransientNetworkError(error)) {
    return new Error("Không thể kết nối Firebase. Vui lòng kiểm tra mạng hoặc cấu hình hosting.");
  }
  return new Error(error?.message || fallbackMessage);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runQuery(collectionName, constraints = [], options = {}) {
  const {
    allowAuthRetry = true,
    networkRetries = 1
  } = options;

  try {
    return await getDocs(query(collection(db, collectionName), ...constraints));
  } catch (error) {
    if (allowAuthRetry && isPermissionError(error)) {
      const user = await ensureAnonymousAuth();
      if (user) {
        return runQuery(collectionName, constraints, { allowAuthRetry: false, networkRetries });
      }
    }

    if (networkRetries > 0 && isTransientNetworkError(error)) {
      await sleep(350);
      return runQuery(collectionName, constraints, { allowAuthRetry: false, networkRetries: networkRetries - 1 });
    }

    throw error;
  }
}

export async function fetchPage(options = {}) {
  const {
    collectionName,
    orderByField = "createdAt",
    orderDirection = "desc",
    pageSize = 10,
    cursor = null,
    filters = []
  } = options;

  const whereConstraints = buildWhereClauses(filters);
  let fallbackMode = false;
  let docs = [];

  const primaryConstraints = [
    ...whereConstraints,
    orderBy(orderByField, orderDirection)
  ];
  if (cursor) primaryConstraints.push(startAfter(cursor));
  primaryConstraints.push(limit(pageSize + 1));

  try {
    const snapshot = await runQuery(collectionName, primaryConstraints);
    docs = snapshot.docs;
  } catch (primaryError) {
    if (!isQueryIndexError(primaryError)) {
      throw toReadableError(primaryError, "Không thể truy vấn dữ liệu Firebase.");
    }

    fallbackMode = true;
    const fallbackConstraints = [...whereConstraints];
    if (cursor) fallbackConstraints.push(startAfter(cursor));
    fallbackConstraints.push(limit(pageSize + 1));

    try {
      const snapshot = await runQuery(collectionName, fallbackConstraints);
      docs = snapshot.docs;
    } catch (fallbackError) {
      if (!cursor) {
        throw toReadableError(fallbackError, "Không thể tải dữ liệu Firebase.");
      }

      // Last-resort fallback for cursor queries without a stable order index.
      const scanLimit = Math.max(120, pageSize * 12);
      try {
        const scanSnapshot = await runQuery(collectionName, [...whereConstraints, limit(scanLimit)]);
        const allDocs = scanSnapshot.docs;
        const index = allDocs.findIndex(item => item.id === cursor.id);
        docs = index >= 0
          ? allDocs.slice(index + 1, index + pageSize + 2)
          : allDocs.slice(0, pageSize + 1);
      } catch (scanError) {
        throw toReadableError(scanError, "Không thể tải dữ liệu Firebase.");
      }
    }
  }

  if (!docs.length && !cursor && !whereConstraints.length && !fallbackMode) {
    // Compatibility for old documents that do not have orderByField (ex: createdAt).
    try {
      fallbackMode = true;
      const snapshot = await runQuery(collectionName, [limit(pageSize + 1)]);
      docs = snapshot.docs;
    } catch (error) {
      throw toReadableError(error, "Không thể tải dữ liệu Firebase.");
    }
  }

  const hasNext = docs.length > pageSize;
  const visible = hasNext ? docs.slice(0, pageSize) : docs;

  return {
    items: visible.map(item => ({ docId: item.id, ...item.data() })),
    nextCursor: visible.length ? visible[visible.length - 1] : null,
    hasNext,
    fallbackMode
  };
}

async function searchSingleField({
  collectionName,
  keyword,
  field,
  filters = [],
  pageSize = 10
}) {
  const keywordLower = String(keyword || "").toLowerCase();
  const prefixEnd = `${keyword}\uf8ff`;
  const whereConstraints = buildWhereClauses(filters);
  const constraints = [
    ...whereConstraints,
    where(field, ">=", keyword),
    where(field, "<=", prefixEnd),
    orderBy(field),
    limit(pageSize)
  ];

  try {
    const snapshot = await runQuery(collectionName, constraints);
    return toData(snapshot);
  } catch (error) {
    if (isPermissionError(error)) {
      throw toReadableError(error, "Không có quyền đọc dữ liệu Firebase.");
    }
    if (!isQueryIndexError(error)) {
      throw toReadableError(error, "Tìm kiếm dữ liệu thất bại.");
    }

    // Fallback when index is missing: scan and filter prefix in memory.
    const fallbackConstraints = [...whereConstraints, limit(Math.max(80, pageSize * 10))];
    const fallbackSnapshot = await runQuery(collectionName, fallbackConstraints);
    return toData(fallbackSnapshot).filter(item => {
      const value = String(item[field] || "").toLowerCase();
      return value.startsWith(keywordLower);
    }).slice(0, pageSize);
  }
}

export async function searchByFields({
  collectionName,
  keyword = "",
  fields = [],
  filters = [],
  pageSize = 10,
  orderByField = "createdAt",
  orderDirection = "desc"
}) {
  const safeKeyword = String(keyword || "").trim();
  if (!safeKeyword || !fields.length) {
    return { items: [], hasNext: false };
  }

  if (fields.length === 1) {
    const items = await searchSingleField({
      collectionName,
      keyword: safeKeyword,
      field: fields[0],
      filters,
      pageSize
    });
    return { items, hasNext: items.length >= pageSize };
  }

  // Firestore does not support multi-field OR prefix in a single standard query.
  const batches = await Promise.all(
    fields.map(field => searchSingleField({
      collectionName,
      keyword: safeKeyword,
      field,
      filters,
      pageSize
    }))
  );

  const mergedMap = new Map();
  batches.flat().forEach(item => {
    if (!mergedMap.has(item.docId)) mergedMap.set(item.docId, item);
  });

  const merged = [...mergedMap.values()];
  merged.sort((a, b) => {
    const aVal = toComparable(a[orderByField]);
    const bVal = toComparable(b[orderByField]);
    if (aVal === bVal) return 0;
    if (orderDirection === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  return {
    items: merged.slice(0, pageSize),
    hasNext: merged.length > pageSize
  };
}
