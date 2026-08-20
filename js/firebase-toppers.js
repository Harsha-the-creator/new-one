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

const COLLECTION   = 'toppers';
const FALLBACK_KEY = 'homepage_toppers';
let db = null;
let listenerUnsubscribe = null;

// ── Local storage helpers ─────────────────────────────────────────────────────
function readFallback() {
  try { return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || '[]'); }
  catch { return []; }
}

function writeFallback(toppers) {
  try { window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(toppers)); }
  catch (e) { console.warn('Unable to persist toppers locally:', e); }
}

// ── Normalise a topper doc ────────────────────────────────────────────────────
function normalizeTopper(t = {}, id = '') {
  return {
    id:        t.id || id || ('topper-' + Date.now()),
    name:      t.name || t.studentName || '',
    class:     t.class || t.className || t.grade || '',
    marks:     t.marks || t.percentage || t.score || '',
    image:     t.image || t.photo || '',
    createdAt: t.createdAt || new Date().toISOString()
  };
}

// Strip base64 image if > 900 KB (Firestore 1 MB limit guard)
const MAX_IMAGE_BYTES = 900 * 1024;
function safePayload(doc) {
  if (doc.image && doc.image.length > MAX_IMAGE_BYTES) {
    console.warn('Topper image too large for Firestore – stored locally only.');
    return { ...doc, image: '' };
  }
  return doc;
}

function dispatchUpdate() {
  try { window.dispatchEvent(new Event('topperDataUpdated')); } catch { /* ignore */ }
}

// ── DB getter ─────────────────────────────────────────────────────────────────
async function getDb() {
  if (db) return db;
  const app = await getFirebaseApp();
  db = getFirestore(app);
  return db;
}

// ── Start real-time Firestore listener ────────────────────────────────────────
function startFirestoreListener() {
  if (listenerUnsubscribe) return;
  getDb().then(database => {
    const q = query(collection(database, COLLECTION), orderBy('createdAt', 'desc'));
    listenerUnsubscribe = onSnapshot(q, snapshot => {
      const firestoreToppers = [];
      snapshot.forEach(d => firestoreToppers.push(normalizeTopper(d.data(), d.id)));
      writeFallback(firestoreToppers);
      dispatchUpdate();
    }, err => {
      console.warn('Firestore toppers listener error (using local fallback):', err);
    });
  }).catch(err => {
    console.warn('Firebase Firestore init failed for toppers:', err);
  });
}

// Kick off listener on module load
startFirestoreListener();

// ── createTopper ──────────────────────────────────────────────────────────────
async function createTopper(entry) {
  const payload = normalizeTopper({ ...entry, createdAt: new Date().toISOString() });

  // Write locally first (use a temp ID)
  payload.id = 'local-topper-' + Date.now();
  const localList = [payload, ...readFallback()];
  writeFallback(localList);
  dispatchUpdate();

  try {
    const database = await getDb();
    const colRef   = collection(database, COLLECTION);
    const docRef   = doc(colRef);
    const topperId = docRef.id;
    const record   = normalizeTopper({ ...payload, id: topperId }, topperId);
    await setDoc(docRef, safePayload(record));

    // Replace local temp entry with Firestore entry
    const updated = readFallback().filter(t => t.id !== payload.id);
    updated.unshift(record);
    writeFallback(updated);
    dispatchUpdate();
    return record;
  } catch (error) {
    console.error('Firestore createTopper failed (saved locally):', error);
    return payload;
  }
}

// ── deleteTopper ──────────────────────────────────────────────────────────────
async function deleteTopper(id) {
  const updated = readFallback().filter(t => t.id !== id);
  writeFallback(updated);
  dispatchUpdate();
  try {
    const database = await getDb();
    if (!String(id).startsWith('local-')) await deleteDoc(doc(database, COLLECTION, id));
  } catch (e) { console.warn('Firestore deleteTopper failed:', e); }
  return updated;
}

// ── clearToppers ──────────────────────────────────────────────────────────────
async function clearToppers() {
  writeFallback([]);
  dispatchUpdate();
  try {
    const database = await getDb();
    const snap  = await getDocs(collection(database, COLLECTION));
    const batch = writeBatch(database);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (e) { console.warn('Firestore clearToppers failed:', e); }
  return [];
}

function getLocalToppers() { return readFallback(); }

// ── Patch window.DB (called by db.js for topper operations) ──────────────────
function patchGlobalDB() {
  if (!window.DB) return;
  window.DB.getToppers = getLocalToppers;
  window.DB.createTopper = function (entry) {
    createTopper(entry).catch(() => {});
    // Return a provisional local copy immediately for UI snappiness
    return readFallback()[0] || normalizeTopper(entry);
  };
  window.DB.deleteTopper = function (id) {
    deleteTopper(id).catch(() => {});
    return readFallback();
  };
  window.DB.clearToppers = function () {
    clearToppers().catch(() => {});
  };
}

patchGlobalDB();
setTimeout(patchGlobalDB, 300);

window.ToppersDB = { getLocalToppers, createTopper, deleteTopper, clearToppers };
