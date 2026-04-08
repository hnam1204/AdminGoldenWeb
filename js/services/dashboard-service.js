import {
  collection,
  db,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query
} from "../firebase/firebase-firestore.js";
import { ensureAnonymousAuth } from "../firebase/firebase-auth.js";
import { numberOrZero } from "../utils/format.js";

export async function getCollectionCount(collectionName) {
  await ensureAnonymousAuth();
  const snap = await getCountFromServer(collection(db, collectionName));
  return snap.data().count || 0;
}

export async function getRecentOrders(limitCount = 20) {
  await ensureAnonymousAuth();
  const q = query(collection(db, "orders"), orderBy("date", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(item => ({ docId: item.id, ...item.data() }));
}

export async function getRecentNews(limitCount = 8) {
  await ensureAnonymousAuth();
  const q = query(collection(db, "news"), orderBy("date", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(item => ({ docId: item.id, ...item.data() }));
}

export async function getRecentUsers(limitCount = 8) {
  await ensureAnonymousAuth();
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(item => ({ docId: item.id, ...item.data() }));
}

export function computeRevenueFromOrders(orders = []) {
  return orders.reduce((sum, item) => sum + numberOrZero(item.totalPrice), 0);
}
