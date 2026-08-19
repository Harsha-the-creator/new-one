// firebase-init.js
// Fetches Firebase config from a Netlify Function at runtime.
// No API keys are stored in any file — they live only in Netlify environment variables.
// All firebase-*.js modules import getFirebaseApp() from here.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

let _appPromise = null;

export function getFirebaseApp() {
  if (_appPromise) return _appPromise;

  _appPromise = fetch('/.netlify/functions/config')
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch Firebase config');
      return res.json();
    })
    .then(config => {
      return getApps().length === 0 ? initializeApp(config) : getApp();
    })
    .catch(err => {
      console.error('Firebase init failed:', err);
      _appPromise = null; // allow retry
      throw err;
    });

  return _appPromise;
}
