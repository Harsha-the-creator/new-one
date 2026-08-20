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
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getFirebaseApp } from "./firebase-init.js";

const COLLECTION = 'students';
const FALLBACK_KEY = 'student_records_fallback';
let db = null;
let activeListenerCallback = null;
let listenerUnsubscribe = null;

// ── Local storage helpers ─────────────────────────────────────────────────────
function readFallback() {
  try { return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || '[]'); }
  catch { return []; }
}

function writeFallback(students) {
  try { window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(students)); }
  catch (e) { console.warn('Unable to persist student records locally:', e); }
}

// ── Normalise a student doc ───────────────────────────────────────────────────
function normalizeStudent(student, id) {
  const fees    = Number(student.fees    || 0);
  const feesPaid= Number(student.feesPaid|| 0);
  return {
    id:            student.id || id || '',
    studentName:   student.studentName || '',
    className:     student.className || student.class || '',
    fees:          isNaN(fees)     ? 0 : fees,
    feesPaid:      isNaN(feesPaid) ? 0 : feesPaid,
    photo:         student.photo || '',
    parentName:    student.parentName || '',
    parentPhone:   student.parentPhone || '',
    admissionDate: student.admissionDate || '',
    notes:         student.notes || '',
    createdAt:     student.createdAt || new Date().toISOString()
  };
}

// Strip base64 photo if it would push the Firestore doc over ~900 KB
const MAX_PHOTO_BYTES = 900 * 1024; // 900 KB safety margin
function safePayload(doc) {
  if (doc.photo && doc.photo.length > MAX_PHOTO_BYTES) {
    console.warn('Student photo too large for Firestore – storing without photo in Firestore (still visible locally).');
    return { ...doc, photo: '' };
  }
  return doc;
}

// ── DB getter ─────────────────────────────────────────────────────────────────
async function getDb() {
  if (db) return db;
  const app = await getFirebaseApp();
  db = getFirestore(app);
  return db;
}

// ── Notify listener ───────────────────────────────────────────────────────────
function notifyListener(students) {
  if (typeof activeListenerCallback === 'function') {
    activeListenerCallback(
      (students || readFallback()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    );
  }
}

// ── addStudent ────────────────────────────────────────────────────────────────
async function addStudent(studentData) {
  const payload = normalizeStudent({ ...studentData, createdAt: new Date().toISOString() });

  // Write to fallback immediately so the UI updates without waiting for Firestore
  const list = readFallback();
  payload.id = payload.id || ('local-' + Date.now());
  list.unshift(payload);
  writeFallback(list);
  notifyListener(list);

  try {
    const database = await getDb();
    const colRef   = collection(database, COLLECTION);
    const docRef   = doc(colRef);
    payload.id = docRef.id;
    await setDoc(docRef, safePayload(payload));

    // Replace the temp entry with the Firestore-issued ID
    const updated = readFallback().map(s => (s.studentName === payload.studentName && String(s.id).startsWith('local-')) ? payload : s);
    writeFallback(updated);
    notifyListener(updated);
  } catch (error) {
    console.error('Firestore addStudent failed (saved locally):', error);
  }
  return payload;
}

// ── listenStudents ────────────────────────────────────────────────────────────
function listenStudents(callback) {
  activeListenerCallback = callback;

  // Immediately serve local data
  callback(readFallback().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

  // Wire up Firestore real-time listener
  getDb().then(database => {
    if (listenerUnsubscribe) { listenerUnsubscribe(); listenerUnsubscribe = null; }
    const q = query(collection(database, COLLECTION), orderBy('createdAt', 'desc'));
    listenerUnsubscribe = onSnapshot(q, snapshot => {
      const firestoreStudents = [];
      snapshot.forEach(d => firestoreStudents.push(normalizeStudent(d.data(), d.id)));
      const localOnly = readFallback().filter(s => s && String(s.id).startsWith('local-'));
      const combined  = [...localOnly, ...firestoreStudents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      writeFallback(combined);
      callback(combined);
    }, err => {
      console.warn('Firestore student listener error (using local fallback):', err);
    });
  }).catch(() => {
    // Already served local data above – nothing more to do
  });

  return () => { if (listenerUnsubscribe) { listenerUnsubscribe(); listenerUnsubscribe = null; } };
}

// ── removeStudent ─────────────────────────────────────────────────────────────
async function removeStudent(id) {
  if (!id) return;
  const updated = readFallback().filter(s => s.id !== id);
  writeFallback(updated);
  notifyListener(updated);
  try {
    const database = await getDb();
    if (!String(id).startsWith('local-')) await deleteDoc(doc(database, COLLECTION, id));
  } catch (e) { console.error('Firestore removeStudent failed:', e); }
}

// ── updateStudent ─────────────────────────────────────────────────────────────
async function updateStudent(id, updates) {
  if (!id) return null;
  const updated = readFallback().map(s => s.id === id ? { ...s, ...updates } : s);
  writeFallback(updated);
  notifyListener(updated);
  try {
    const database = await getDb();
    if (!String(id).startsWith('local-')) await updateDoc(doc(database, COLLECTION, id), safePayload(updates));
  } catch (e) { console.error('Firestore updateStudent failed:', e); }
  return { id, ...updates };
}

// ── clearAllStudents ──────────────────────────────────────────────────────────
async function clearAllStudents() {
  writeFallback([]);
  notifyListener([]);
  try {
    const database = await getDb();
    const snap  = await getDocs(collection(database, COLLECTION));
    const batch = writeBatch(database);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (e) { console.error('Firestore clearAllStudents failed:', e); }
}

window.StudentDB = { addStudent, listenStudents, removeStudent, updateStudent, clearAllStudents };
