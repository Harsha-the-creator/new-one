import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  writeBatch,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getFirebaseApp } from "./firebase-init.js";

const COLLECTION   = 'applications';
const FALLBACK_KEY = 'admissions_applications';
let db = null;
let activeListenerCallbacks = [];
let listenerUnsubscribe = null;

// ── Local storage helpers ─────────────────────────────────────────────────────
function readFallback() {
  try { return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || '[]'); }
  catch { return []; }
}

function writeFallback(apps) {
  try { window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(apps)); }
  catch (e) { console.warn('Unable to persist applications locally:', e); }
}

// ── Notify all active listeners ───────────────────────────────────────────────
function notifyListeners(apps) {
  const list = apps || readFallback();
  activeListenerCallbacks.forEach(cb => { try { cb(list); } catch (e) { console.warn('App listener error:', e); } });
  try { window.dispatchEvent(new Event('applicationDataUpdated')); } catch { /* ignore */ }
}

// ── Normalise an application doc ─────────────────────────────────────────────
function normalizeApplication(app = {}, id = '') {
  return {
    id:            app.id || id || '',
    studentName:   app.studentName || '',
    dob:           app.dob || '',
    gender:        app.gender || '',
    parentName:    app.parentName || '',
    parentPhone:   app.parentPhone || '',
    email:         app.email || '',
    address:       app.address || '',
    classApplying: app.classApplying || app.class || '',
    prevSchool:    app.prevSchool || 'N/A',
    docName:       app.docName || app.documentName || 'not_uploaded.pdf',
    docType:       app.docType || 'application/pdf',
    docSize:       Number(app.docSize || 0),
    status:        app.status || 'pending',
    createdAt:     app.createdAt || new Date().toISOString(),
    updatedAt:     app.updatedAt || new Date().toISOString()
  };
}

// ── DB getter ─────────────────────────────────────────────────────────────────
async function getDb() {
  if (db) return db;
  const app = await getFirebaseApp();
  db = getFirestore(app);
  return db;
}

// ── Start real-time Firestore listener (called once) ─────────────────────────
function startFirestoreListener() {
  if (listenerUnsubscribe) return;
  getDb().then(database => {
    const q = query(collection(database, COLLECTION), orderBy('createdAt', 'desc'));
    listenerUnsubscribe = onSnapshot(q, snapshot => {
      const firestoreApps = [];
      snapshot.forEach(d => firestoreApps.push(normalizeApplication(d.data(), d.id)));
      const localOnly = readFallback().filter(a => a && String(a.id).startsWith('local-'));
      const combined  = [...localOnly, ...firestoreApps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      writeFallback(combined);
      notifyListeners(combined);
    }, err => {
      console.warn('Firestore applications listener error (using local fallback):', err);
    });
  }).catch(err => {
    console.warn('Firebase Firestore init failed for applications:', err);
  });
}

// Start listener immediately when module loads
startFirestoreListener();

// ── listenApplications ────────────────────────────────────────────────────────
function listenApplications(callback) {
  if (typeof callback !== 'function') return () => {};
  activeListenerCallbacks.push(callback);
  callback(readFallback()); // serve cached data immediately
  return () => {
    activeListenerCallbacks = activeListenerCallbacks.filter(c => c !== callback);
  };
}

// ── ID generator ─────────────────────────────────────────────────────────────
function generateApplicationId() {
  if (window.DB && typeof window.DB.generateUniqueId === 'function') {
    return window.DB.generateUniqueId();
  }
  const year = new Date().getFullYear();
  return `ADM-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// ── addApplication ────────────────────────────────────────────────────────────
async function addApplication(appData) {
  const appId   = appData.id || generateApplicationId();
  const payload = normalizeApplication({ ...appData, id: appId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, appId);

  // Save locally and notify immediately
  const fallback = readFallback();
  const existingIndex = fallback.findIndex(a => a.id === payload.id);
  if (existingIndex >= 0) { fallback[existingIndex] = payload; } else { fallback.unshift(payload); }
  writeFallback(fallback);
  notifyListeners(fallback);

  // Persist to Firestore asynchronously
  try {
    const database = await getDb();
    await setDoc(doc(database, COLLECTION, payload.id), payload);
  } catch (error) {
    console.error('Firestore addApplication failed (saved locally):', error);
  }
  return payload;
}

// ── getApplications ───────────────────────────────────────────────────────────
async function getApplications() {
  // Trigger a one-shot sync but return what we have immediately
  try {
    const database = await getDb();
    const snap     = await getDocs(query(collection(database, COLLECTION), orderBy('createdAt', 'desc')));
    const firestoreApps = [];
    snap.forEach(d => firestoreApps.push(normalizeApplication(d.data(), d.id)));
    const localOnly = readFallback().filter(a => a && String(a.id).startsWith('local-'));
    const combined  = [...localOnly, ...firestoreApps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    writeFallback(combined);
    notifyListeners(combined);
    return combined;
  } catch {
    return readFallback();
  }
}

function getLocalApplications() { return readFallback(); }

// ── getApplicationById ────────────────────────────────────────────────────────
async function getApplicationById(id) {
  if (!id) return null;
  const clean = String(id).trim().toUpperCase();
  const local = readFallback().find(a => String(a.id).trim().toUpperCase() === clean);
  if (local) return local;
  try {
    const database = await getDb();
    const snap = await getDoc(doc(database, COLLECTION, id));
    if (!snap.exists()) return null;
    const remote = normalizeApplication(snap.data(), snap.id);
    const updated = [remote, ...readFallback()];
    writeFallback(updated);
    notifyListeners(updated);
    return remote;
  } catch { return null; }
}

// ── updateApplicationStatus ───────────────────────────────────────────────────
async function updateApplicationStatus(id, newStatus) {
  if (!id) return null;
  const fallback = readFallback().map(a =>
    a.id === id ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a
  );
  writeFallback(fallback);
  notifyListeners(fallback);
  const updated = fallback.find(a => a.id === id) || null;
  try {
    const database = await getDb();
    await updateDoc(doc(database, COLLECTION, id), { status: newStatus, updatedAt: new Date().toISOString() });
  } catch (e) { console.warn('Firestore updateApplicationStatus failed:', e); }
  return updated;
}

// ── clearApplications ─────────────────────────────────────────────────────────
async function clearApplications() {
  writeFallback([]);
  notifyListeners([]);
  try {
    const database = await getDb();
    const snap  = await getDocs(collection(database, COLLECTION));
    const batch = writeBatch(database);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (e) { console.warn('Firestore clearApplications failed:', e); }
  return [];
}

// ── Patch window.DB ───────────────────────────────────────────────────────────
function patchGlobalDB() {
  if (!window.DB) return;
  window.DB.createApplication   = addApplication;
  window.DB.clearApplications   = clearApplications;
  window.DB.updateApplicationStatus = updateApplicationStatus;

  // Synchronous with async background sync
  window.DB.getApplications = function () {
    getApplications().catch(() => {});
    return readFallback();
  };

  window.DB.getApplicationById = function (id) {
    if (!id) return null;
    const clean = String(id).trim().toUpperCase();
    const found = readFallback().find(a => String(a.id).trim().toUpperCase() === clean);
    if (found) return found;
    getApplicationById(id).catch(() => {});
    return null;
  };
}

// Patch immediately and again after other scripts may have loaded window.DB
patchGlobalDB();
setTimeout(patchGlobalDB, 300);

window.ApplicationDB = {
  addApplication,
  getApplications,
  getLocalApplications,
  getApplicationById,
  updateApplicationStatus,
  clearApplications,
  listenApplications
};
