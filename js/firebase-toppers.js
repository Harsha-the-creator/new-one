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

import { getFirebaseApp } from "./firebase-init.js";

const TOPPERS_COLLECTION = 'toppers';
const FALLBACK_KEY = 'homepage_toppers';
let db = null;
let initialized = false;
let listenerUnsubscribe = null;

function readFallbackToppers() {
  try {
    return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || '[]');
  } catch { return []; }
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
    id: topper.id || id || 'topper-' + Date.now(),
    name: topper.name || topper.studentName || '',
    class: topper.class || topper.className || topper.grade || '',
    marks: topper.marks || topper.percentage || topper.score || '',
    image: topper.image || topper.photo || '',
    createdAt: topper.createdAt || new Date().toISOString()
  };
}

function dispatchTopperUpdateEvent() {
  try { window.dispatchEvent(new Event('topperDataUpdated')); } catch { /* ignore */ }
}

async function getDb() {
  if (db) return db;
  const app = await getFirebaseApp();
  try { getAnalytics(app); } catch { /* ignore in unsupported environments */ }
  db = getFirestore(app);
  return db;
}

async function syncToppersFromRemote() {
  try {
    const database = await getDb();
    const toppersRef = collection(database, TOPPERS_COLLECTION);
    const q = query(toppersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const firestoreToppers = [];
    snapshot.forEach((docSnap) => firestoreToppers.push(normalizeTopper(docSnap.data(), docSnap.id)));
    writeFallbackToppers(firestoreToppers);
    dispatchTopperUpdateEvent();
    return firestoreToppers;
  } catch (error) {
    console.warn('Unable to load topper highlights from Firebase, falling back to local copy:', error);
    return readFallbackToppers();
  }
}

async function startRemoteListener() {
  if (listenerUnsubscribe) return;
  try {
    const database = await getDb();
    const toppersRef = collection(database, TOPPERS_COLLECTION);
    const q = query(toppersRef, orderBy('createdAt', 'desc'));
    listenerUnsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreToppers = [];
      snapshot.forEach((docSnap) => firestoreToppers.push(normalizeTopper(docSnap.data(), docSnap.id)));
      writeFallbackToppers(firestoreToppers);
      dispatchTopperUpdateEvent();
    }, (error) => {
      console.warn('Realtime topper listener failed, using local copy:', error);
    });
  } catch { /* ignore */ }
}

async function createTopper(entry) {
  const payload = { ...normalizeTopper(entry), createdAt: new Date().toISOString() };
  try {
    const database = await getDb();
    const toppersRef = collection(database, TOPPERS_COLLECTION);
    const docRef = doc(toppersRef);
    const topperId = docRef.id;
    const topperRecord = normalizeTopper({ ...payload, id: topperId }, topperId);
    await setDoc(docRef, topperRecord);
    const toppers = readFallbackToppers();
    toppers.unshift(topperRecord);
    writeFallbackToppers(toppers);
    return topperRecord;
  } catch (error) {
    console.error('firebase-toppers: failed to save to Firestore, storing locally:', error);
    const toppers = readFallbackToppers();
    toppers.unshift(payload);
    writeFallbackToppers(toppers);
    return payload;
  }
}

async function deleteTopper(id) {
  try {
    const database = await getDb();
    await deleteDoc(doc(database, TOPPERS_COLLECTION, id));
    const fallbackToppers = readFallbackToppers().filter(t => t.id !== id);
    writeFallbackToppers(fallbackToppers);
    return fallbackToppers;
  } catch (error) {
    console.warn('Unable to delete topper from Firebase:', error);
    return readFallbackToppers();
  }
}

async function clearToppers() {
  writeFallbackToppers([]);
  try {
    const database = await getDb();
    const toppersRef = collection(database, TOPPERS_COLLECTION);
    const snapshot = await getDocs(toppersRef);
    const batch = writeBatch(database);
    snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  } catch (error) {
    console.warn('Unable to clear topper highlights from Firebase:', error);
  }
  return [];
}

function getLocalToppers() { return readFallbackToppers(); }

async function initToppers() {
  await syncToppersFromRemote();
  startRemoteListener();
}

window.ToppersDB = { getLocalToppers, createTopper, deleteTopper, clearToppers, initToppers };

initToppers();
