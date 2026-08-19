/**
 * School Admission Management System - Authentication Helper
 */

function logoutAdminWrapper() {
  if (typeof window.logoutAdmin === 'function') {
    window.logoutAdmin();
  } else {
    window.location.href = 'admin.html';
  }
}

function checkAuthAndRedirect() {
  if (typeof window.checkDashboardAuth === 'function') {
    window.checkDashboardAuth();
  } else if (window.location.pathname.includes('dashboard.html')) {
    window.location.href = 'admin.html';
  }
}

// Export auth helpers for dashboard interactions
window.Auth = {
  logout: logoutAdminWrapper,
  checkAuthAndRedirect
};
