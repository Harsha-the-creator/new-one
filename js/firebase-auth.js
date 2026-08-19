import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirebaseApp } from "./firebase-init.js";

let auth = null;

// Initialize auth as soon as the script loads
getFirebaseApp().then(app => {
  auth = getAuth(app);
}).catch(err => {
  console.error('Auth initialization failed:', err);
});

function showAuthFeedback(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  if (toastContainer && typeof window.showToast === 'function') {
    window.showToast('Password Reset', message, type);
    return;
  }
  alert(message);
}

window.loginAdmin = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");
  const pageLoader = document.getElementById('pageLoader');
  const submitBtn = document.querySelector('#adminLoginForm button[type="submit"]');
  const forgotBtn = document.querySelector('#adminLoginForm button[onclick="forgotPassword()"]');

  msg.innerText = "";
  msg.style.color = "";

  try {
    if (pageLoader) {
      pageLoader.style.display = 'flex';
      pageLoader.classList.remove('fade-out');
    }
    if (submitBtn) submitBtn.disabled = true;
    if (forgotBtn) forgotBtn.disabled = true;

    // Ensure auth is ready before logging in
    if (!auth) {
      const app = await getFirebaseApp();
      auth = getAuth(app);
    }

    await signInWithEmailAndPassword(auth, email, password);
    msg.style.color = "green";
    msg.innerText = "Login successful. Redirecting...";
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  } catch (error) {
    console.error('Firebase login failed:', error);
    msg.style.color = "red";
    msg.innerText = "Invalid email or password";
    if (pageLoader) {
      pageLoader.classList.add('fade-out');
      setTimeout(() => { pageLoader.style.display = 'none'; }, 400);
    }
    if (submitBtn) submitBtn.disabled = false;
    if (forgotBtn) forgotBtn.disabled = false;
  }
};

window.forgotPassword = async function () {
  const email = document.getElementById("email").value.trim();
  const msg = document.getElementById("msg");
  msg.innerText = "";
  msg.style.color = "";

  if (!email) {
    msg.style.color = "red";
    msg.innerText = "Enter your email first";
    return;
  }

  try {
    if (!auth) {
      const app = await getFirebaseApp();
      auth = getAuth(app);
    }
    await sendPasswordResetEmail(auth, email);
    msg.style.color = "green";
    msg.innerText = "Password reset email sent. Check your inbox.";
  } catch (error) {
    console.error('Password reset failed:', error);
    msg.style.color = "red";
    msg.innerText = "Unable to send reset email";
  }
};

window.resetCurrentAdminPassword = async function () {
  if (!auth) {
    const app = await getFirebaseApp();
    auth = getAuth(app);
  }
  const user = auth.currentUser;
  if (!user || !user.email) {
    showAuthFeedback('Please sign in again before resetting your password.', 'error');
    return;
  }
  const confirmed = confirm('Send a password reset email to your registered admin email?');
  if (!confirmed) return;
  try {
    await sendPasswordResetEmail(auth, user.email);
    showAuthFeedback('Password reset email sent to your registered admin email.', 'success');
  } catch (error) {
    console.error('Password reset failed:', error);
    showAuthFeedback('Unable to send password reset email right now.', 'error');
  }
};

window.logoutAdmin = async function () {
  try {
    if (!auth) {
      const app = await getFirebaseApp();
      auth = getAuth(app);
    }
    await signOut(auth);
  } catch (error) {
    console.error('Firebase sign out failed:', error);
  }
  window.location.href = "admin.html";
};

window.checkDashboardAuth = function () {
  getFirebaseApp().then(app => {
    const authInstance = getAuth(app);
    auth = authInstance;
    onAuthStateChanged(authInstance, function (user) {
      const currentPath = window.location.pathname;
      if (user && currentPath.includes('dashboard.html')) {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0 && navEntries[0].type === 'reload') {
          signOut(authInstance).then(() => {
            window.location.href = 'admin.html';
          });
          return;
        }
      }
      if (!user && currentPath.includes('dashboard.html')) {
        window.location.href = 'admin.html';
        return;
      }
      if (user && currentPath.includes('admin.html')) {
        window.location.href = 'dashboard.html';
      }
    });
  }).catch(err => {
    console.error('checkDashboardAuth failed:', err);
    if (window.location.pathname.includes('dashboard.html')) {
      window.location.href = 'admin.html';
    }
  });
};

// Inactivity Logout (1 Hour)
let inactivityTimer;
const INACTIVITY_LIMIT = 60 * 60 * 1000;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(async () => {
    if (auth && auth.currentUser && window.location.pathname.includes('dashboard.html')) {
      alert("Session expired due to inactivity.");
      window.logoutAdmin();
    }
  }, INACTIVITY_LIMIT);
}

if (window.location.pathname.includes('dashboard.html')) {
  ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}