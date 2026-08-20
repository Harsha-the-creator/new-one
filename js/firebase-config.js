// firebase-config.js
// Client-side Firebase configuration fallback template.
// Values can be set via window.FIREBASE_CONFIG or process.env variables via server/Netlify function.

export const firebaseConfig = window.FIREBASE_CONFIG || {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};
