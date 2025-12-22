// ----------------------
// Firebase configuration
// ----------------------
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";

// Environment config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// ----------------------
// Firebase Authentication
// ----------------------
export const auth = getAuth(app);

// Keep user logged in (works offline)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error:", error);
});

// ----------------------
// Firestore (Offline First)
// ----------------------
export const db = getFirestore(app);

// Enable offline cache + auto sync
enableIndexedDbPersistence(db, { synchronizeTabs: true }).catch((error) => {
  if (error.code === "failed-precondition") {
    console.warn(
      "Offline persistence failed: multiple tabs open."
    );
  } else if (error.code === "unimplemented") {
    console.warn(
      "Offline persistence is not supported by this browser."
    );
  }
});

export default app;
