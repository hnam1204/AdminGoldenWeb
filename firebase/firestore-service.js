import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db } from "./firebase-app.js";

export async function getCollection(name, options = {}) {
  const ref = collection(db, name);
  const q = options.orderByField ? query(ref, orderBy(options.orderByField, options.orderDirection || "desc")) : ref;
  const snapshot = await getDocs(q);
  return snapshot.docs.map(item => ({ docId: item.id, ...item.data() }));
}

export async function getDocument(name, id) {
  const ref = doc(db, name, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { docId: snapshot.id, ...snapshot.data() };
}

export async function createDocument(name, data, customId = null) {
  if (customId) {
    const ref = doc(db, name, customId);
    await setDoc(ref, data);
    return ref;
  }
  return addDoc(collection(db, name), data);
}

export async function updateDocument(name, id, data) {
  return updateDoc(doc(db, name, id), data);
}

export async function removeDocument(name, id) {
  return deleteDoc(doc(db, name, id));
}

export function withServerTimestamp(data, field = "createdAt") {
  return { ...data, [field]: serverTimestamp() };
}
