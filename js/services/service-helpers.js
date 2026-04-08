import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  setDoc,
  updateDoc
} from "../firebase/firebase-firestore.js";
import { ensureAnonymousAuth } from "../firebase/firebase-auth.js";

export async function createDoc(collectionName, payload, customId = null) {
  await ensureAnonymousAuth();
  if (customId) {
    const ref = doc(db, collectionName, customId);
    await setDoc(ref, payload);
    return ref;
  }
  return addDoc(collection(db, collectionName), payload);
}

export async function updateDocById(collectionName, id, payload) {
  await ensureAnonymousAuth();
  return updateDoc(doc(db, collectionName, id), payload);
}

export async function removeDocById(collectionName, id) {
  await ensureAnonymousAuth();
  return deleteDoc(doc(db, collectionName, id));
}
