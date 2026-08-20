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

const APPLICATIONS_COLLECTION = 'applications';
const FALLBACK_KEY = 'admissions_applications';
let db = null;
let activeListenerCallbacks = [];

function readFallbackApplications() {
  try {
    return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || '[]');
  } catch { return []; }
}

function writeFallbackApplications(apps) {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(apps));
  } catch (error) {
    console.warn('Unable to persist fallback applications:', error);
  }
}

function notifyListeners() {
  const apps = readFallbackApplications();
  activeListenerCallbacks.forEach(cb => {
    try { cb(apps); } catch (e) { console.warn('Application listener callback error:', e); }
  });
  try { window.dispatchEvent(new Event('applicationDataUpdated')); } catch { /* ignore */ }
}

function listenApplications(callback) {
  if (typeof callback === 'function') {
    activeListenerCallbacks.push(callback);
    callback(readFallbackApplications());
  }
  return () => {
    activeListenerCallbacks = activeListenerCallbacks.filter(c => c !== callback);
  };
}

function normalizeApplication(app = {}, id = '') {
  return {
    id: app.id || id || '',
    studentName: app.studentName || '',
    dob: app.dob || '',
    gender: app.gender || '',
    parentName: app.parentName || '',
    parentPhone: app.parentPhone || '',
    email: app.email || '',
    address: app.address || '',
    classApplying: app.classApplying || app.class || '',
    prevSchool: app.prevSchool || 'N/A',
    docName: app.docName || app.documentName || 'not_uploaded.pdf',
    docType: app.docType || 'application/pdf',
    docSize: Number(app.docSize || 0),
    status: app.status || 'pending',
    createdAt: app.createdAt || new Date().toISOString(),
    updatedAt: app.updatedAt || new Date().toISOString()
  };
}

async function getDb() {
  if (db) return db;
  const app = await getFirebaseApp();
  db = getFirestore(app);
  return db;
}

// Start real-time Firestore listener
getDb().then(database => {
  const appsRef = collection(database, APPLICATIONS_COLLECTION);
  const q = query(appsRef, orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    const firestoreApps = [];
    snapshot.forEach((docSnap) => firestoreApps.push(normalizeApplication(docSnap.data(), docSnap.id)));
    const fallback = readFallbackApplications();
    const localOnly = fallback.filter(a => a && String(a.id).startsWith('local-'));
    const combined = [...localOnly, ...firestoreApps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    writeFallbackApplications(combined);
    notifyListeners();
  }, (err) => {
    console.warn('Realtime applications listener failed, using local fallback:', err);
  });
}).catch(err => {
  console.warn('Firebase Firestore initialization failed for applications:', err);
});

function generateApplicationId() {
  if (window.DB && typeof window.DB.generateUniqueId === 'function') {
    return window.DB.generateUniqueId();
  }
  const currentYear = new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `ADM-${currentYear}-${randomDigits}`;
}

async function addApplication(appData) {
  const appId = appData.id || generateApplicationId();
  const payload = normalizeApplication({
    ...appData,
    id: appId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, appId);

  // Save to fallback storage immediately
  const fallback = readFallbackApplications();
  const existingIndex = fallback.findIndex(a => a.id === payload.id);
  if (existingIndex >= 0) {
    fallback[existingIndex] = payload;
  } else {
    fallback.unshift(payload);
  }
  writeFallbackApplications(fallback);
  notifyListeners();

  try {
    const database = await getDb();
    const docRef = doc(database, APPLICATIONS_COLLECTION, payload.id);
    await setDoc(docRef, payload);
    return payload;
  } catch (error) {
    console.error('Firestore addApplication failed. Fallback storage was updated:', error);
    return payload;
  }
}

async function syncApplicationsFromRemote() {
  try {
    const database = await getDb();
    const appsRef = collection(database, APPLICATIONS_COLLECTION);
    const q = query(appsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const firestoreApps = [];
    snapshot.forEach((docSnap) => firestoreApps.push(normalizeApplication(docSnap.data(), docSnap.id)));
    const fallback = readFallbackApplications();
    const localOnly = fallback.filter(a => a && String(a.id).startsWith('local-'));
    const combined = [...localOnly, ...firestoreApps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    writeFallbackApplications(combined);
    notifyListeners();
    return combined;
  } catch (error) {
    console.warn('Unable to load applications from Firestore, using local fallback:', error);
    return readFallbackApplications();
  }
}

async function getApplications() {
  return await syncApplicationsFromRemote();
}

function getLocalApplications() {
  return readFallbackApplications();
}

async function getApplicationById(id) {
  if (!id) return null;
  const cleanId = String(id).trim().toUpperCase();
  const foundLocal = readFallbackApplications().find(a => String(a.id).trim().toUpperCase() === cleanId);
  if (foundLocal) return foundLocal;
  try {
    const database = await getDb();
    const docRef = doc(database, APPLICATIONS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const remoteApp = normalizeApplication(snap.data(), snap.id);
    const fallback = readFallbackApplications();
    fallback.unshift(remoteApp);
    writeFallbackApplications(fallback);
    notifyListeners();
    return remoteApp;
  } catch (error) {
    console.warn('Firestore getApplicationById failed:', error);
    return null;
  }
}

async function updateApplicationStatus(id, newStatus) {
  if (!id) return null;
  const fallback = readFallbackApplications().map(a =>
    a.id === id ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a
  );
  writeFallbackApplications(fallback);
  notifyListeners();
  
  const updatedApp = fallback.find(a => a.id === id) || null;
  try {
    const database = await getDb();
    await updateDoc(doc(database, APPLICATIONS_COLLECTION, id), { status: newStatus, updatedAt: new Date().toISOString() });
    return updatedApp;
  } catch (error) {
    console.warn('Firestore updateApplicationStatus failed:', error);
    return updatedApp;
  }
}

async function clearApplications() {
  writeFallbackApplications([]);
  notifyListeners();
  try {
    const database = await getDb();
    const appsRef = collection(database, APPLICATIONS_COLLECTION);
    const snapshot = await getDocs(appsRef);
    const batch = writeBatch(database);
    snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    return [];
  } catch (error) {
    console.warn('Firestore clearApplications failed:', error);
    return [];
  }
}

window.ApplicationDB = {
  addApplication,
  getApplications,
  getLocalApplications,
  getApplicationById,
  updateApplicationStatus,
  clearApplications,
  listenApplications,
  syncApplicationsFromRemote
};

function patchGlobalDB() {
  if (!window.DB) return;
  if (typeof window.ApplicationDB.addApplication === 'function') window.DB.createApplication = window.ApplicationDB.addApplication;

  // Ensure window.DB.getApplications returns Array synchronously for compatibility, while syncing Firestore in background
  window.DB.getApplications = function() {
    syncApplicationsFromRemote().catch(() => {});
    return readFallbackApplications();
  };

  // Synchronous lookup with async fallback
  window.DB.getApplicationById = function(id) {
    if (!id) return null;
    const cleanId = String(id).trim().toUpperCase();
    const found = readFallbackApplications().find(a => String(a.id).trim().toUpperCase() === cleanId);
    if (found) return found;
    getApplicationById(id).catch(() => {});
    return null;
  };

  if (typeof window.ApplicationDB.updateApplicationStatus === 'function') window.DB.updateApplicationStatus = window.ApplicationDB.updateApplicationStatus;
  if (typeof window.ApplicationDB.clearApplications === 'function') window.DB.clearApplications = window.ApplicationDB.clearApplications;
}

patchGlobalDB();
setTimeout(patchGlobalDB, 150);
