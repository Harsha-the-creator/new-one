import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./js/firebase-config.js";

const TOPPERS_COLLECTION = 'toppers';
const FALLBACK_KEY = 'homepage_toppers';
let db = null;
let initialized = false;
let listenerUnsubscribe = null;

function readFallbackToppers() {
  try {
    return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || '[]');
  } catch (error) {
    console.warn('Unable to read local topper backup:', error);
    return [];
  }
}

function writeFallbackToppers(toppers) {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(toppers));
  } catch (error) {
    console.warn('Unable to persist local topper backup:', error);
  }
}

function normalizeTopper(topper = {}, id = '') {
  return {
    id: topper.id || id || topper.id || 'topper-' + Date.now(),
    name: topper.name || topper.studentName || '',
    class: topper.class || topper.className || topper.grade || '',
    marks: topper.marks || topper.percentage || topper.score || '',
    image: topper.image || topper.photo || '',
    createdAt: topper.createdAt || new Date().toISOString()
  };
}

async function initFirebase() {
  if (initialized) return;

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    try {
      getAnalytics(app);
    } catch (analyticsError) {
      // Analytics can fail in unsupported environments; we only care about persistence.
      console.warn('Firebase Analytics initialization skipped:', analyticsError);
    }
    db = getFirestore(app);
    console.info('Firebase Topper persistence initialized for project:', app.options.projectId);
  } catch (error) {
    console.warn('Firebase Topper persistence initialization failed, using local storage only:', error);
    db = null;
    storage = null;
  } finally {
    initialized = true;
  }
}

async function pushLocalTopperToRemote(topper) {
  if (!db) return null;

  const payload = normalizeTopper(topper, topper.id);
  const docId = payload.id || doc(collection(db, TOPPERS_COLLECTION)).id;
  const docRef = doc(db, TOPPERS_COLLECTION, docId);
  const topperRecord = normalizeTopper({ ...payload, id: docId }, docId);
  await setDoc(docRef, topperRecord);
  return topperRecord;
}

function dispatchTopperUpdateEvent() {
  try {
    window.dispatchEvent(new Event('topperDataUpdated'));
  } catch (error) {
    console.warn('Unable to dispatch topper update event:', error);
  }
}

async function syncToppersFromRemote() {
  if (!db) return readFallbackToppers();

  try {
    const toppersRef = collection(db, TOPPERS_COLLECTION);
    const q = query(toppersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const firestoreToppers = [];
    snapshot.forEach((docSnap) => {
      firestoreToppers.push(normalizeTopper(docSnap.data(), docSnap.id));
    });

    if (firestoreToppers.length === 0) {
      const localToppers = readFallbackToppers();
      if (localToppers.length > 0) {
        for (const localTopper of localToppers) {
          try {
            await pushLocalTopperToRemote(localTopper);
          } catch (error) {
            console.warn('Unable to migrate local topper to Firestore:', error);
          }
        }
        return syncToppersFromRemote();
      }
    }

    writeFallbackToppers(firestoreToppers);
    dispatchTopperUpdateEvent();
    return firestoreToppers;
  } catch (error) {
    console.warn('Unable to load topper highlights from Firebase, falling back to local copy:', error);
    return readFallbackToppers();
  }
}

async function startRemoteListener() {
  if (!db || listenerUnsubscribe) return;

  const toppersRef = collection(db, TOPPERS_COLLECTION);
  const q = query(toppersRef, orderBy('createdAt', 'desc'));
  listenerUnsubscribe = onSnapshot(q, (snapshot) => {
    const firestoreToppers = [];
    snapshot.forEach((docSnap) => {
      firestoreToppers.push(normalizeTopper(docSnap.data(), docSnap.id));
    });
    writeFallbackToppers(firestoreToppers);
    dispatchTopperUpdateEvent();
  }, (error) => {
    console.warn('Realtime topper listener failed, using local copy:', error);
  });
}

async function createTopper(entry) {
  const payload = {
    ...normalizeTopper(entry),
    createdAt: new Date().toISOString()
  };

  console.info('firebase-toppers: creating topper entry', payload);

  if (!db) {
    console.warn('firebase-toppers: Firebase is not ready, saving topper locally only.');
    const toppers = readFallbackToppers();
    toppers.unshift(payload);
    writeFallbackToppers(toppers);
    return payload;
  }

  try {
    const toppersRef = collection(db, TOPPERS_COLLECTION);
    const docRef = doc(toppersRef);
    const topperId = docRef.id;
    const topperRecord = normalizeTopper({ ...payload, id: topperId }, topperId);

    await setDoc(docRef, topperRecord);
    console.info('firebase-toppers: topper saved to Firestore', topperRecord);
    const toppers = readFallbackToppers();
    toppers.unshift(topperRecord);
    writeFallbackToppers(toppers);
    return topperRecord;
  } catch (error) {
    console.error('firebase-toppers: failed to save topper to Firestore, storing locally instead:', error);
    const toppers = readFallbackToppers();
    toppers.unshift(payload);
    writeFallbackToppers(toppers);
    return payload;
  }
}

async function deleteTopper(id) {
  const fallbackToppers = readFallbackToppers().filter(topper => topper.id !== id);
  writeFallbackToppers(fallbackToppers);

  if (!db) return fallbackToppers;

  try {
    const docRef = doc(db, TOPPERS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Unable to delete topper highlight from Firebase:', error);
  }

  return fallbackToppers;
}

async function clearToppers() {
  writeFallbackToppers([]);

  if (!db) return [];

  try {
    const toppersRef = collection(db, TOPPERS_COLLECTION);
    const snapshot = await getDocs(toppersRef);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  } catch (error) {
    console.warn('Unable to clear topper highlights from Firebase:', error);
  }

  return [];
}

function getLocalToppers() {
  return readFallbackToppers();
}

async function initToppers() {
  await initFirebase();
  await syncToppersFromRemote();
  startRemoteListener();
}

window.ToppersDB = {
  getLocalToppers,
  createTopper,
  deleteTopper,
  clearToppers,
  initToppers
};

initToppers();
