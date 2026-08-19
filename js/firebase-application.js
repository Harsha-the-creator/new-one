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

getFirebaseApp().then(app => {
  db = getFirestore(app);
}).catch(err => {
  console.warn('Firebase Firestore initialization failed for applications:', err);
});

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

async function addApplication(appData) {
  const payload = normalizeApplication({ ...appData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  try {
    const database = await getDb();
    const appsRef = collection(database, APPLICATIONS_COLLECTION);
    const docRef = doc(appsRef);
    payload.id = docRef.id;
    await setDoc(docRef, payload);
    return payload;
  } catch (error) {
    console.error('Firestore addApplication failed. Falling back to local storage:', error);
    payload.id = 'local-' + Date.now();
    const fallback = readFallbackApplications();
    fallback.unshift(payload);
    writeFallbackApplications(fallback);
    return payload;
  }
}

async function getApplications() {
  const fallback = readFallbackApplications();
  try {
    const database = await getDb();
    const appsRef = collection(database, APPLICATIONS_COLLECTION);
    const q = query(appsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const firestoreApps = [];
    snapshot.forEach((docSnap) => firestoreApps.push(normalizeApplication(docSnap.data(), docSnap.id)));
    const localOnly = fallback.filter(a => String(a.id).startsWith('local-'));
    const combined = [...localOnly, ...firestoreApps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    writeFallbackApplications(combined);
    return combined;
  } catch (error) {
    console.warn('Unable to load applications from Firestore, using local fallback:', error);
    return fallback;
  }
}

async function getApplicationById(id) {
  if (!id) return null;
  const foundLocal = readFallbackApplications().find(a => String(a.id).toUpperCase() === String(id).trim().toUpperCase());
  if (foundLocal) return foundLocal;
  try {
    const database = await getDb();
    const docRef = doc(database, APPLICATIONS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return normalizeApplication(snap.data(), snap.id);
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
  try {
    const database = await getDb();
    await updateDoc(doc(database, APPLICATIONS_COLLECTION, id), { status: newStatus, updatedAt: new Date().toISOString() });
    return fallback.find(a => a.id === id) || null;
  } catch (error) {
    console.warn('Firestore updateApplicationStatus failed:', error);
    return fallback.find(a => a.id === id) || null;
  }
}

async function clearApplications() {
  writeFallbackApplications([]);
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

window.ApplicationDB = { addApplication, getApplications, getApplicationById, updateApplicationStatus, clearApplications };

function patchGlobalDB() {
  if (!window.DB) return;
  if (typeof window.ApplicationDB.addApplication === 'function') window.DB.createApplication = window.ApplicationDB.addApplication;
  if (typeof window.ApplicationDB.getApplications === 'function') window.DB.getApplications = window.ApplicationDB.getApplications;
  if (typeof window.ApplicationDB.getApplicationById === 'function') window.DB.getApplicationById = window.ApplicationDB.getApplicationById;
  if (typeof window.ApplicationDB.updateApplicationStatus === 'function') window.DB.updateApplicationStatus = window.ApplicationDB.updateApplicationStatus;
  if (typeof window.ApplicationDB.clearApplications === 'function') window.DB.clearApplications = window.ApplicationDB.clearApplications;
}

setTimeout(patchGlobalDB, 150);
