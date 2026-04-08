import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let authReadyPromise = null;
let ensureAnonymousPromise = null;

export function waitForAuthState(timeoutMs = 3000) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise(resolve => {
    let done = false;
    const stop = onAuthStateChanged(
      auth,
      user => {
        if (done) return;
        done = true;
        stop();
        resolve(user || null);
      },
      () => {
        if (done) return;
        done = true;
        stop();
        resolve(null);
      }
    );

    setTimeout(() => {
      if (done) return;
      done = true;
      stop();
      resolve(auth.currentUser || null);
    }, timeoutMs);
  }).finally(() => {
    authReadyPromise = null;
  });

  return authReadyPromise;
}

export async function ensureAnonymousAuth() {
  const existing = auth.currentUser || await waitForAuthState();
  if (existing) return existing;

  if (!ensureAnonymousPromise) {
    ensureAnonymousPromise = signInAnonymously(auth)
      .then(credential => credential?.user || auth.currentUser || null)
      .catch(error => {
        console.warn("Anonymous auth is unavailable:", error?.code || error?.message || error);
        return null;
      })
      .finally(() => {
        ensureAnonymousPromise = null;
      });
  }

  return ensureAnonymousPromise;
}
