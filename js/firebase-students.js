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

const FALLBACK_KEY = 'student_records_fallback';
let db = null;
let activeListenerCallback = null;

// Initialize Firestore when the module loads
getFirebaseApp().then(app => {
  db = getFirestore(app);
}).catch(err => {
  console.warn('Firebase Firestore initialization failed, using fallback storage:', err);
});

function readFallbackStudents() {
  try {
    return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || '[]');
  } catch { return []; }
}

function writeFallbackStudents(students) {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(students));
  } catch (error) {
    console.warn('Unable to persist fallback student records:', error);
  }
}

function normalizeStudent(student, id) {
  const feesValue = Number(student.fees || 0);
  const feesPaidValue = Number(student.feesPaid || 0);
  return {
    id: student.id || id || '',
    studentName: student.studentName || '',
    className: student.className || student.class || '',
    fees: Number.isNaN(feesValue) ? 0 : feesValue,
    feesPaid: Number.isNaN(feesPaidValue) ? 0 : feesPaidValue,
    photo: student.photo || '',
    parentName: student.parentName || '',
    parentPhone: student.parentPhone || '',
    admissionDate: student.admissionDate || '',
    notes: student.notes || '',
    createdAt: student.createdAt || new Date().toISOString()
  };
}

function notifyListener() {
  if (activeListenerCallback) {
    const fallbackStudents = readFallbackStudents();
    activeListenerCallback(fallbackStudents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }
}

async function getDb() {
  if (db) return db;
  const app = await getFirebaseApp();
  db = getFirestore(app);
  return db;
}

async function addStudent(studentData) {
  const payload = normalizeStudent({ ...studentData, createdAt: new Date().toISOString() });
  try {
    const database = await getDb();
    const studentsRef = collection(database, 'students');
    const docRef = doc(studentsRef);
    payload.id = docRef.id;
    await setDoc(docRef, payload);
    return payload;
  } catch (error) {
    console.error('Firestore addStudent failed:', error);
    payload.id = 'local-' + Date.now();
    const fallbackStudents = readFallbackStudents();
    fallbackStudents.unshift(payload);
    writeFallbackStudents(fallbackStudents);
    notifyListener();
    return payload;
  }
}

function listenStudents(callback) {
  activeListenerCallback = callback;
  getDb().then(database => {
    const studentsRef = collection(database, 'students');
    const q = query(studentsRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const firestoreStudents = [];
      snapshot.forEach((d) => firestoreStudents.push(normalizeStudent(d.data(), d.id)));
      const fallbackStudents = readFallbackStudents();
      const localOnly = fallbackStudents.filter(s => s && String(s.id).startsWith('local-'));
      const combined = [...localOnly, ...firestoreStudents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      writeFallbackStudents(combined);
      callback(combined);
    }, (error) => {
      console.warn('Firestore student listener failed, using local fallback:', error);
      callback(readFallbackStudents().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
  }).catch(() => {
    callback(readFallbackStudents().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    return () => {};
  });
  return () => {};
}

async function removeStudent(id) {
  if (!id) return;
  const fallbackStudents = readFallbackStudents().filter(s => s.id !== id);
  writeFallbackStudents(fallbackStudents);
  notifyListener();
  try {
    const database = await getDb();
    await deleteDoc(doc(database, 'students', id));
  } catch (error) {
    console.error('Firestore removeStudent failed:', error);
  }
}

async function updateStudent(id, updates) {
  if (!id) return null;
  const fallbackStudents = readFallbackStudents().map(s => s.id === id ? { ...s, ...updates } : s);
  writeFallbackStudents(fallbackStudents);
  notifyListener();
  try {
    const database = await getDb();
    await updateDoc(doc(database, 'students', id), updates);
    return { id, ...updates };
  } catch (error) {
    console.error('Firestore updateStudent failed:', error);
    return { id, ...updates };
  }
}

async function clearAllStudents() {
  writeFallbackStudents([]);
  notifyListener();
  try {
    const database = await getDb();
    const studentsRef = collection(database, 'students');
    const snapshot = await getDocs(studentsRef);
    const batch = writeBatch(database);
    snapshot.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    console.error('Firestore clearAllStudents failed:', error);
  }
}

window.StudentDB = { addStudent, listenStudents, removeStudent, updateStudent, clearAllStudents };
