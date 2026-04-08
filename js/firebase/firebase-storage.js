import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const storage = getStorage(app);

function sanitizeSegment(value, fallback = "item") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function buildStoragePath({ bucket = "uploads", field = "image", recordId = "new", fileName = "file.jpg" }) {
  const ext = (fileName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeBucket = sanitizeSegment(bucket, "uploads");
  const safeField = sanitizeSegment(field, "image");
  const safeRecordId = sanitizeSegment(recordId, "new");
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${safeBucket}/${safeField}/${safeRecordId}/${suffix}.${ext || "jpg"}`;
}

export async function uploadImageToStorage(file, options = {}) {
  const path = buildStoragePath({
    bucket: options.bucket,
    field: options.field,
    recordId: options.recordId,
    fileName: file?.name || "image.jpg"
  });
  const uploadRef = ref(storage, path);
  await uploadBytes(uploadRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(uploadRef);
}
