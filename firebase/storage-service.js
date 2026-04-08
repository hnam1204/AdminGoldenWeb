import {
  getDownloadURL,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";
import { storage } from "./firebase-app.js";

function sanitizeSegment(value, fallback = "item") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function buildImagePath({ collectionName, fieldKey, recordId, fileName }) {
  const extension = (fileName?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const folder = sanitizeSegment(collectionName, "uploads");
  const field = sanitizeSegment(fieldKey, "image");
  const item = sanitizeSegment(recordId, "new");
  return `${folder}/${field}/${item}/${unique}.${extension || "jpg"}`;
}

export async function uploadImageFile(file, options = {}) {
  if (!(file instanceof File)) {
    throw new Error("File upload không hợp lệ.");
  }
  const storagePath = buildImagePath({
    collectionName: options.collectionName,
    fieldKey: options.fieldKey,
    recordId: options.recordId,
    fileName: file.name
  });
  const uploadRef = ref(storage, storagePath);
  await uploadBytes(uploadRef, file, {
    contentType: file.type || "image/jpeg"
  });
  return getDownloadURL(uploadRef);
}
