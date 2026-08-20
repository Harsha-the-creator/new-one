// firebase-init.js
// Fetches Firebase config from a Netlify Function at runtime.
// No API keys are stored in any file — they live only in Netlify environment variables.
// All firebase-*.js modules import getFirebaseApp() from here.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

let _appPromise = null;

export function getFirebaseApp() {
  if (_appPromise) return _appPromise;

  _appPromise = (async () => {
    // 1. Check window.FIREBASE_CONFIG
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
      return getApps().length === 0 ? initializeApp(window.FIREBASE_CONFIG) : getApp();
    }

    // 2. Try fetching from /.netlify/functions/config
    try {
      const res = await fetch('/.netlify/functions/config');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const config = await res.json();
        if (config && config.apiKey && config.apiKey.trim() !== '') {
          return getApps().length === 0 ? initializeApp(config) : getApp();
        }
      }
    } catch (err) {
      console.warn('Firebase init: function config endpoint unavailable:', err.message);
    }

    // 3. Try importing local js/firebase-config.js fallback
    try {
      const mod = await import('./firebase-config.js');
      if (mod && mod.firebaseConfig && mod.firebaseConfig.apiKey && mod.firebaseConfig.apiKey.trim() !== '') {
        return getApps().length === 0 ? initializeApp(mod.firebaseConfig) : getApp();
      }
    } catch (err) {
      // Optional fallback file missing or empty
    }

    throw new Error('Firebase credentials not configured. Operating in local storage fallback mode.');
  })().catch(err => {
    _appPromise = null; // allow retry if credentials are set later
    throw err;
  });

  return _appPromise;
}
