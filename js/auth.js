function logoutAdminWrapper() {
  if (typeof window.logoutAdmin === 'function') {
    window.logoutAdmin();
  } else {
    window.location.href = 'admin.html';
  }
}

function checkAuthAndRedirect() {
  // firebase-auth.js registers window.checkDashboardAuth asynchronously (ES module).
  // Retry until it's available (max ~2 s).
  if (typeof window.checkDashboardAuth === 'function') {
    window.checkDashboardAuth();
    return;
  }
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (typeof window.checkDashboardAuth === 'function') {
      clearInterval(interval);
      window.checkDashboardAuth();
    } else if (attempts >= 40) {
      clearInterval(interval);
      // firebase-auth module never loaded — redirect to login
      if (window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'admin.html';
      }
    }
  }, 50);
}

// Export auth helpers for dashboard interactions
window.Auth = {
  logout: logoutAdminWrapper,
  checkAuthAndRedirect
};
