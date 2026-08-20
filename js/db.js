/**
 * School Admission Management System - Database Layer (LocalStorage)
 */

const DB_KEY = 'admissions_applications';
const TOPPERS_KEY = 'homepage_toppers';
const EMAIL_LOG_KEY = 'admissions_emails';
const MESSAGES_LOG_KEY = 'contact_messages';

// Initialize DB storage for the admin portal
function initDb() {
  const existingApplications = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
  const demoApplicationIds = ['ADM-2026-3941', 'ADM-2026-8812', 'ADM-2026-4731', 'ADM-2026-1925'];
  const demoNames = ['Alex Mercer', 'Sophia Lin', 'Marcus Aurelius', 'Emma Watson'];

  if (!Array.isArray(existingApplications) || existingApplications.some(app => {
    const id = app && typeof app.id === 'string' ? app.id : '';
    const name = app && typeof app.studentName === 'string' ? app.studentName : '';
    return demoApplicationIds.includes(id) || demoNames.includes(name);
  })) {
    localStorage.setItem(DB_KEY, JSON.stringify([]));
  }

  if (!localStorage.getItem(EMAIL_LOG_KEY)) {
    localStorage.setItem(EMAIL_LOG_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(MESSAGES_LOG_KEY)) {
    localStorage.setItem(MESSAGES_LOG_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(TOPPERS_KEY)) {
    localStorage.setItem(TOPPERS_KEY, JSON.stringify([]));
  }
}

// Get all applications
function getApplications() {
  initDb();
  return JSON.parse(localStorage.getItem(DB_KEY)) || [];
}

// Get topper highlight entries for homepage
function getToppers() {
  initDb();
  if (window.ToppersDB && typeof window.ToppersDB.getLocalToppers === 'function') {
    return window.ToppersDB.getLocalToppers() || JSON.parse(localStorage.getItem(TOPPERS_KEY)) || [];
  }
  return JSON.parse(localStorage.getItem(TOPPERS_KEY)) || [];
}

function getTopperById(id) {
  const list = getToppers();
  return list.find(topper => topper.id === id) || null;
}

function whenToppersDbReady() {
  return new Promise(resolve => {
    if (window.ToppersDB && typeof window.ToppersDB.createTopper === 'function') {
      return resolve();
    }

    let attempts = 0;
    const waitForToppersDB = () => {
      if (window.ToppersDB && typeof window.ToppersDB.createTopper === 'function') {
        return resolve();
      }
      attempts += 1;
      if (attempts >= 50) {
        return resolve();
      }
      setTimeout(waitForToppersDB, 100);
    };

    waitForToppersDB();
  });
}

function createTopper(entry) {
  const list = getToppers();
  const newTopper = {
    id: 'TOP-' + Math.floor(100000 + Math.random() * 900000),
    name: entry.name,
    class: entry.class,
    marks: entry.marks,
    image: entry.image,
    createdAt: new Date().toISOString()
  };
  list.unshift(newTopper);
  localStorage.setItem(TOPPERS_KEY, JSON.stringify(list));

  if (window.ToppersDB) {
    whenToppersDbReady().then(() => {
      if (typeof window.ToppersDB.createTopper !== 'function') {
        window.dispatchEvent(new Event('topperDataUpdated'));
        return;
      }

      window.ToppersDB.createTopper(entry).then(remoteTopper => {
        if (!remoteTopper || !remoteTopper.id) {
          window.dispatchEvent(new Event('topperDataUpdated'));
          return;
        }
        const current = JSON.parse(localStorage.getItem(TOPPERS_KEY)) || [];
        const filtered = current.filter(topper => topper.id !== newTopper.id);
        filtered.unshift(remoteTopper);
        localStorage.setItem(TOPPERS_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new Event('topperDataUpdated'));
      }).catch(() => {
        window.dispatchEvent(new Event('topperDataUpdated'));
      });
    });
  } else {
    window.dispatchEvent(new Event('topperDataUpdated'));
  }

  return newTopper;
}

function deleteTopper(id) {
  let list = getToppers();
  list = list.filter(topper => topper.id !== id);
  localStorage.setItem(TOPPERS_KEY, JSON.stringify(list));

  if (window.ToppersDB) {
    whenToppersDbReady().then(() => {
      if (typeof window.ToppersDB.deleteTopper === 'function') {
        window.ToppersDB.deleteTopper(id).catch(() => {
          // keep local deletion even if remote fails
        });
      }
    });
  }

  window.dispatchEvent(new Event('topperDataUpdated'));
  return list;
}

function clearToppers() {
  localStorage.setItem(TOPPERS_KEY, JSON.stringify([]));

  if (window.ToppersDB) {
    whenToppersDbReady().then(() => {
      if (typeof window.ToppersDB.clearToppers === 'function') {
        window.ToppersDB.clearToppers().catch(() => {
          // keep local clear even if remote clear fails
        });
      }
    });
  }

  window.dispatchEvent(new Event('topperDataUpdated'));
}

// Get single application by ID
function getApplicationById(id) {
  const list = getApplications();
  return list.find(app => app.id.toUpperCase() === id.trim().toUpperCase()) || null;
}

// Generate Unique Application ID (ADM-2026-XXXX)
function generateUniqueId() {
  const list = getApplications();
  const currentYear = new Date().getFullYear();
  let uniqueId = '';
  let isUnique = false;

  while (!isUnique) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digit random number
    uniqueId = `ADM-${currentYear}-${randomDigits}`;

    // Check collision
    isUnique = !list.some(app => app.id === uniqueId);
  }
  return uniqueId;
}

// Create new application
async function createApplication(appData) {
  const list = getApplications();
  const newId = generateUniqueId();

  const newApp = {
    id: newId,
    studentName: appData.studentName,
    dob: appData.dob,
    gender: appData.gender,
    parentName: appData.parentName,
    parentPhone: appData.parentPhone,
    email: appData.email,
    address: appData.address,
    classApplying: appData.classApplying,
    prevSchool: appData.prevSchool || 'N/A',
    docName: appData.docName || 'not_uploaded.pdf',
    docType: appData.docType || 'application/pdf',
    docSize: appData.docSize || 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  list.push(newApp);
  localStorage.setItem(DB_KEY, JSON.stringify(list));

  return newApp;
}

// Update application status (approve / reject)
function updateApplicationStatus(id, newStatus) {
  const list = getApplications();
  const index = list.findIndex(app => app.id === id);

  if (index === -1) return null;

  list[index].status = newStatus;
  list[index].updatedAt = new Date().toISOString();

  localStorage.setItem(DB_KEY, JSON.stringify(list));

  const updatedApp = list[index];

  // Send status email update notification
  let emailSubject = `Application Status Update: ${updatedApp.id}`;
  let emailBody = '';

  if (newStatus === 'approved') {
    emailBody = `Dear ${updatedApp.parentName},\n\nWe are absolutely delighted to inform you that the application for **${updatedApp.studentName}** (ID: ${updatedApp.id}) has been **APPROVED** for admission to ${updatedApp.classApplying} at GAYATRI JUNIOR & DEGREE COLLEGE.\n\nPlease visit the school administration office within the next 7 business days to complete the physical verification of documents and pay the admission fees.\n\nRequired Documents:\n- Printout of Application PDF (attached/available on status page)\n- Original Birth Certificate of student\n- Original academic report card of the previous school\n- 3 passport-sized color photographs\n\nCongratulations and welcome to the Gayatri Family!\n\nBest regards,\nOffice of Admissions\nGAYATRI JUNIOR & DEGREE COLLEGE`;
  } else if (newStatus === 'rejected') {
    emailBody = `Dear ${updatedApp.parentName},\n\nThank you for your interest in GAYATRI JUNIOR & DEGREE COLLEGE. We have completed the review of the admission application for **${updatedApp.studentName}** (ID: ${updatedApp.id}) for admission to ${updatedApp.classApplying}.\n\nAfter careful consideration of all applications and our current class capacity limits, we regret to inform you that we are unable to offer admission for this academic year. We wish your child the absolute best in their future academic endeavors.\n\nBest regards,\nOffice of Admissions\nGAYATRI JUNIOR & DEGREE COLLEGE`;
  } else {
    emailBody = `Dear ${updatedApp.parentName},\n\nThe status of the application for **${updatedApp.studentName}** (ID: ${updatedApp.id}) has been updated back to **PENDING / UNDER REVIEW**.\n\nWe will notify you immediately once a final determination is made.\n\nBest regards,\nOffice of Admissions\nGAYATRI JUNIOR & DEGREE COLLEGE`;
  }

  return updatedApp;
}

// Clear all application records
function clearApplications() {
  localStorage.setItem(DB_KEY, JSON.stringify([]));
}

// Simulate Email log helper
function logSimulatedEmail(to, subject, body) {
  const emails = JSON.parse(localStorage.getItem(EMAIL_LOG_KEY)) || [];
  const newEmail = {
    id: 'EMAIL-' + Math.floor(100000 + Math.random() * 900000),
    to: to,
    subject: subject,
    body: body,
    sentAt: new Date().toISOString()
  };
  emails.unshift(newEmail); // Keep newest first
  localStorage.setItem(EMAIL_LOG_KEY, JSON.stringify(emails));

  // Also log to console for debugging purposes
  console.log(`%c[SIMULATED EMAIL SENT] To: ${to}\nSubject: ${subject}\n\n${body}`, 'background: #eff6ff; color: #1e40af; padding: 10px; border-left: 4px solid #2563eb;');
}

// Get all email logs (for admin review)
function getEmailLogs() {
  initDb();
  return JSON.parse(localStorage.getItem(EMAIL_LOG_KEY)) || [];
}

// Create a new contact message
function createContactMessage(messageData) {
  const messages = JSON.parse(localStorage.getItem(MESSAGES_LOG_KEY)) || [];
  const newMessage = {
    id: 'MSG-' + Math.floor(100000 + Math.random() * 900000),
    name: messageData.name,
    email: messageData.email,
    subject: messageData.subject,
    message: messageData.message,
    createdAt: new Date().toISOString(),
    status: 'unread'
  };

  messages.unshift(newMessage); // Keep newest first
  localStorage.setItem(MESSAGES_LOG_KEY, JSON.stringify(messages));

  console.log(`%c[NEW CONTACT MESSAGE] From: ${newMessage.name} (${newMessage.email})\nSubject: ${newMessage.subject}\n\n${newMessage.message}`, 'background: #f0fdf4; color: #166534; padding: 10px; border-left: 4px solid #22c55e;');

  return newMessage;
}

// Get all contact messages
function getContactMessages() {
  initDb();
  return JSON.parse(localStorage.getItem(MESSAGES_LOG_KEY)) || [];
}

// Mark message as read
function markMessageAsRead(messageId) {
  const messages = JSON.parse(localStorage.getItem(MESSAGES_LOG_KEY)) || [];
  const message = messages.find(m => m.id === messageId);

  if (message) {
    message.status = 'read';
    localStorage.setItem(MESSAGES_LOG_KEY, JSON.stringify(messages));
  }

  return message;
}

// Export database operations globally
window.DB = {
  generateUniqueId,
  getApplications,
  getApplicationById,
  getToppers,
  getTopperById,
  createTopper,
  deleteTopper,
  clearToppers,
  createApplication,
  updateApplicationStatus,
  clearApplications,
  getEmailLogs,
  createContactMessage,
  getContactMessages,
  markMessageAsRead
};


// Auto-run init on script load
initDb();


