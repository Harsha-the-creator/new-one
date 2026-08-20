/**
 * School Admission Management System - Dashboard Panel Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Verify admin session login state first
  if (typeof window.Auth !== 'undefined') {
    window.Auth.checkAuthAndRedirect();
  }

  // DOM Elements
  const tableBody = document.getElementById('applicationsTableBody');
  const searchInput = document.getElementById('dbSearchInput');
  const classFilter = document.getElementById('filterClass');
  const statusFilter = document.getElementById('filterStatus');
  const clearApplicationsBtn = document.getElementById('clearApplicationsBtn');
  const topperName = document.getElementById('topperName');
  const topperClass = document.getElementById('topperClass');
  const topperMarks = document.getElementById('topperMarks');
  const topperPhoto = document.getElementById('topperPhoto');
  const addTopperBtn = document.getElementById('addTopperBtn');
  const clearToppersBtn = document.getElementById('clearToppersBtn');
  const topperTableBody = document.getElementById('topperTableBody');
  const tabBtnToppers = document.getElementById('tabBtnToppers');
  const tabContentToppers = document.getElementById('tabContentToppers');
  const tabBtnStudents = document.getElementById('tabBtnStudents');
  const tabContentStudents = document.getElementById('tabContentStudents');

  // Student database elements
  const studentNameInput = document.getElementById('studentNameInput');
  const studentClassInput = document.getElementById('studentClassInput');
  const studentFeesInput = document.getElementById('studentFeesInput');
  const studentPhotoInput = document.getElementById('studentPhotoInput');
  const parentNameInput = document.getElementById('parentNameInput');
  const parentPhoneInput = document.getElementById('parentPhoneInput');
  const admissionDateInput = document.getElementById('admissionDateInput');
  const notesInput = document.getElementById('notesInput');
  const addStudentBtn = document.getElementById('addStudentBtn');
  const studentSearchInput = document.getElementById('studentSearchInput');
  const studentClassFilter = document.getElementById('studentClassFilter');
  const clearStudentsBtn = document.getElementById('clearStudentsBtn');
  const studentTableBody = document.getElementById('studentTableBody');
  let studentRecords = [];
  
  // Stats Elements
  const statTotal = document.getElementById('statTotal');
  const statPending = document.getElementById('statPending');
  const statApproved = document.getElementById('statApproved');
  const statRejected = document.getElementById('statRejected');
  
  // Tab elements
  const tabBtnApps = document.getElementById('tabBtnApplications');
  const tabBtnMessages = document.getElementById('tabBtnMessages');
  const tabContentApps = document.getElementById('tabContentApplications');
  const tabContentMessages = document.getElementById('tabContentMessages');
  const messagesTableBody = document.getElementById('messagesTableBody');
  const messagesCount = document.getElementById('messagesCount');
  const messagesEmptyState = document.getElementById('messagesEmptyState');
  const clearMessagesBtn = document.getElementById('clearMessagesBtn');

  // Modal elements
  const modalOverlay = document.getElementById('appDetailsModal');
  const btnModalClose = document.getElementById('btnModalClose');
  const btnModalCloseFooter = document.getElementById('btnModalCloseFooter');
  const btnModalTrack = document.getElementById('btnModalTrack');
  const btnModalViewDoc = document.getElementById('btnModalViewDoc');

  // Student modal elements
  const studentModalOverlay = document.getElementById('studentDetailsModal');
  const btnStudentModalClose = document.getElementById('btnStudentModalClose');
  const btnStudentModalCloseFooter = document.getElementById('btnStudentModalCloseFooter');
  
  // Init page data loads
  loadDashboardData();
  initStudentRecords();

  // Tab Toggling Action Bindings
  [tabBtnApps, tabBtnToppers, tabBtnMessages, tabBtnStudents].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      const targetTab = btn.getAttribute('data-tab');
      
      tabBtnApps.classList.remove('active');
      tabBtnToppers.classList.remove('active');
      tabBtnMessages.classList.remove('active');
      if (tabBtnStudents) tabBtnStudents.classList.remove('active');
      
      tabContentApps.classList.remove('active');
      tabContentToppers.classList.remove('active');
      tabContentMessages.classList.remove('active');
      if (tabContentStudents) tabContentStudents.classList.remove('active');
      
      btn.classList.add('active');
      
      if (targetTab === 'applications') {
        tabContentApps.classList.add('active');
        loadDashboardData();
      } else if (targetTab === 'toppers') {
        tabContentToppers.classList.add('active');
        renderToppersTable();
      } else if (targetTab === 'messages') {
        tabContentMessages.classList.add('active');
        renderMessagesTable();
      } else if (targetTab === 'students') {
        tabContentStudents.classList.add('active');
        renderStudentTable();
      }
    });
  });

  // Filters change bindings
  [searchInput, classFilter, statusFilter].forEach(el => {
    el.addEventListener('input', () => {
      renderApplicationsTable();
    });
  });

  // Student database actions
  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', saveStudentRecord);
  }

  if (clearStudentsBtn) {
    clearStudentsBtn.addEventListener('click', clearAllStudents);
  }

  [studentSearchInput, studentClassFilter].forEach(el => {
    if (el) {
      el.addEventListener('input', renderStudentTable);
    }
  });

  // Clear all applications button
  if (clearApplicationsBtn) {
    clearApplicationsBtn.addEventListener('click', () => {
      if (confirm('This will delete all application records permanently. Are you sure you want to continue?')) {
        clearAllApplications();
      }
    });
  }

  // Clear all contact messages button
  if (clearMessagesBtn) {
    clearMessagesBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all contact messages permanently?')) {
        localStorage.setItem('contact_messages', JSON.stringify([]));
        showToast('Messages Cleared', 'All contact messages have been deleted.', 'success');
        renderMessagesTable();
      }
    });
  }

  // Topper management actions
  if (addTopperBtn) {
    addTopperBtn.addEventListener('click', () => {
      addTopperEntry();
    });
  }

  window.addEventListener('topperDataUpdated', () => {
    renderToppersTable();
  });

  if (clearToppersBtn) {
    clearToppersBtn.addEventListener('click', () => {
      if (confirm('This will clear all topper entries displayed on the homepage. Continue?')) {
        clearAllToppers();
      }
    });
  }

  // Loader master coordinator function
  function loadDashboardData() {
    renderApplicationsTable();
    calculateStatsMetrics();
    renderToppersTable();
  }

  // Real-time application updates event listener
  window.addEventListener('applicationDataUpdated', () => {
    renderApplicationsTable();
    calculateStatsMetrics();
  });

  // Render Datatable applications list rows
  async function renderApplicationsTable() {
    tableBody.innerHTML = '';
    
    // Fetch latest rows from DB layer safely handling sync array or Promise
    const rawApps = window.DB.getApplications();
    const appsList = Array.isArray(rawApps) ? rawApps : (await rawApps) || [];
    const query = searchInput.value.toLowerCase().trim();
    const selectedClass = classFilter.value;
    const selectedStatus = statusFilter.value;
    
    // Apply searches & filters
    const filteredApps = appsList.filter(app => {
      if (!app) return false;
      const sName = app.studentName ? app.studentName.toLowerCase() : '';
      const sId = app.id ? app.id.toLowerCase() : '';
      const pName = app.parentName ? app.parentName.toLowerCase() : '';

      const matchQuery = sName.includes(query) || 
                         sId.includes(query) || 
                         pName.includes(query);
                         
      const matchClass = selectedClass === '' ? true : app.classApplying === selectedClass;
      const matchStatus = selectedStatus === '' ? true : app.status === selectedStatus;
      
      return matchQuery && matchClass && matchStatus;
    });

    // Handle empty table lists
    if (filteredApps.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-table-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 0.5rem;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>No matching applications found.</div>
          </td>
        </tr>
      `;
      return;
    }

    // Sort newest applications first
    filteredApps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Populate rows
    filteredApps.forEach(app => {
      const tr = document.createElement('tr');
      
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--brand);">${app.id}</td>
        <td style="font-weight: 600;">${app.studentName}</td>
        <td><span class="badge badge-brand">${app.classApplying}</span></td>
        <td>${formatDate(app.createdAt)}</td>
        <td><span class="status-badge ${app.status}">${app.status}</span></td>
        <td>
          <div class="table-actions">
            <button class="action-btn btn-view" title="View Application Details" data-id="${app.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="action-btn btn-approve" title="Approve Application" data-id="${app.id}" ${app.status === 'approved' ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="action-btn btn-reject" title="Reject Application" data-id="${app.id}" ${app.status === 'rejected' ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </td>
      `;
      
      tableBody.appendChild(tr);
    });

    // Bind clicks to dynamically loaded actions buttons
    bindRowActions();
  }

  // Bind row elements actions triggers
  function bindRowActions() {
    // View Click Handlers
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openDetailsModal(id);
      });
    });

    // Approve Click Handlers
    document.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Are you sure you want to APPROVE application ${id}?`)) {
          processStatusChange(id, 'approved');
        }
      });
    });

    // Reject Click Handlers
    document.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Are you sure you want to REJECT application ${id}?`)) {
          processStatusChange(id, 'rejected');
        }
      });
    });
  }

  // Handle updates in statuses
  async function processStatusChange(id, status) {
    const raw = window.DB.updateApplicationStatus(id, status);
    const updated = (raw && typeof raw.then === 'function') ? await raw : raw;
    
    loadDashboardData();
    
    const type = status === 'approved' ? 'success' : 'error';
    showToast(
      'Application Updated', 
      `Status of ${id} set to ${status.toUpperCase()}. Simulated email sent.`, 
      type
    );
  }

  // Clear all application records
  async function clearAllApplications() {
    const raw = window.DB.clearApplications();
    if (raw && typeof raw.then === 'function') await raw;
    loadDashboardData();
    showToast('Application Database Cleared', 'All application records have been removed.', 'success');
  }

  function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = function (err) {
          reject(err);
        };
        img.src = event.target.result;
      };
      reader.onerror = function (err) {
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  }

  async function addTopperEntry() {
    const name = topperName?.value.trim();
    const topperClassValue = topperClass?.value.trim();
    const marks = topperMarks?.value.trim();
    const file = topperPhoto?.files?.[0];

    if (!name || !topperClassValue || !marks) {
      showToast('Missing Topper Details', 'Please provide name, class, and marks for the topper.', 'error');
      return;
    }

    if (!file) {
      showToast('Please add a photo', 'Upload a topper photo so it appears on the homepage slider.', 'error');
      return;
    }

    try {
      const imageData = await compressImage(file, 600, 400, 0.75);
      window.DB.createTopper({
        name,
        class: topperClassValue,
        marks,
        image: imageData
      });
      topperName.value = '';
      topperClass.value = '';
      topperMarks.value = '';
      topperPhoto.value = '';
      renderToppersTable();
      showToast('Topper Added', 'The topper has been added to the homepage highlights.', 'success');
    } catch (error) {
      console.error('Unable to add topper entry:', error);
      showToast('Add Failed', 'The topper entry could not be added.', 'error');
    }
  }

  function clearAllToppers() {
    window.DB.clearToppers();
    renderToppersTable();
    showToast('Topper Highlights Cleared', 'Homepage topper entries have been removed.', 'success');
  }

  function initStudentRecords() {
    if (!window.StudentDB || typeof window.StudentDB.listenStudents !== 'function') {
      window.setTimeout(initStudentRecords, 250);
      return;
    }

    window.StudentDB.listenStudents((students) => {
      studentRecords = students || [];
      renderStudentTable();
    });
  }

  async function saveStudentRecord() {
    if (!window.StudentDB || typeof window.StudentDB.addStudent !== 'function') {
      showToast('Student system is still loading', 'Please wait a moment and try again.', 'error');
      return;
    }
    const studentName = studentNameInput?.value.trim();
    const className = studentClassInput?.value.trim();
    const feesValue = studentFeesInput?.value.trim();
    const feesPaidValue = document.getElementById('studentFeesPaidInput')?.value.trim() || 0;
    const parentName = parentNameInput?.value.trim();
    const parentPhone = parentPhoneInput?.value.trim();
    const admissionDate = admissionDateInput?.value;
    const notes = notesInput?.value.trim();
    const file = studentPhotoInput?.files?.[0];

    if (!studentName || !className) {
      showToast('Missing Student Details', 'Please provide the student name and class.', 'error');
      return;
    }

    const payload = {
      studentName,
      className,
      fees: Number(feesValue || 0),
      feesPaid: Number(feesPaidValue || 0),
      parentName,
      parentPhone,
      admissionDate,
      notes
    };

    try {
      let photoData = '';
      if (file) {
        try {
          photoData = await compressImage(file, 400, 400, 0.7);
        } catch (compressErr) {
          console.warn('Image compression failed, using original file:', compressErr);
          photoData = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = (e) => resolve(e.target.result);
            r.readAsDataURL(file);
          });
        }
      }

      await window.StudentDB.addStudent({ ...payload, photo: photoData });
      resetStudentForm();
      showToast('Student Added', 'Student record saved successfully to Firebase.', 'success');
    } catch (error) {
      console.error('Unable to save student record:', error);
      showToast('Save Failed', 'The student record could not be saved.', 'error');
    }
  }

  function resetStudentForm() {
    if (studentNameInput) studentNameInput.value = '';
    if (studentClassInput) studentClassInput.value = '';
    if (studentFeesInput) studentFeesInput.value = '';
    const feesPaidInput = document.getElementById('studentFeesPaidInput');
    if (feesPaidInput) feesPaidInput.value = '0';
    if (studentPhotoInput) studentPhotoInput.value = '';
    if (parentNameInput) parentNameInput.value = '';
    if (parentPhoneInput) parentPhoneInput.value = '';
    if (admissionDateInput) admissionDateInput.value = '';
    if (notesInput) notesInput.value = '';
  }

  function renderStudentTable() {
    if (!studentTableBody) return;

    const query = studentSearchInput?.value.toLowerCase().trim() || '';
    const selectedClass = studentClassFilter?.value || '';

    const filteredStudents = studentRecords.filter(student => {
      const matchQuery = !query ||
        student.studentName?.toLowerCase().includes(query) ||
        student.parentName?.toLowerCase().includes(query);
      const matchClass = !selectedClass || student.className === selectedClass;
      return matchQuery && matchClass;
    });

    studentTableBody.innerHTML = '';

    if (filteredStudents.length === 0) {
      studentTableBody.innerHTML = `
        <tr>
          <td colspan="11" class="empty-table-placeholder">
            <div>No student records found for the selected filters.</div>
          </td>
        </tr>
      `;
      return;
    }

    filteredStudents.forEach(student => {
      const tr = document.createElement('tr');
      const photoMarkup = student.photo
        ? `<img src="${student.photo}" alt="${student.studentName}" style="width:72px; height:72px; object-fit:cover; border-radius: .75rem; border: 1px solid var(--border);" />`
        : `<div style="width:72px; height:72px; display:flex; align-items:center; justify-content:center; border:1px dashed var(--border); border-radius:.75rem; color: var(--text-muted); font-size:0.8rem;">No Photo</div>`;

      const totalFees = Number(student.fees || 0);
      const feesPaid = Number(student.feesPaid || 0);
      const balance = totalFees - feesPaid;

      tr.innerHTML = `
        <td>${photoMarkup}</td>
        <td style="font-weight: 600;">${student.studentName || 'N/A'}</td>
        <td><span class="badge badge-brand">${student.className || 'N/A'}</span></td>
        <td>${formatCurrency(totalFees)}</td>
        <td>${formatCurrency(feesPaid)}</td>
        <td style="font-weight: 700; color: ${balance > 0 ? 'var(--brand)' : 'var(--success)'};">${formatCurrency(balance)}</td>
        <td>${student.parentName || 'N/A'}</td>
        <td>${student.parentPhone || 'N/A'}</td>
        <td>${student.admissionDate ? formatDate(student.admissionDate) : 'N/A'}</td>
        <td>${student.notes ? student.notes : '—'}</td>
        <td>
          <div class="table-actions" style="gap: 0.5rem;">
            <button class="action-btn btn-view-student" data-id="${student.id}" title="View Student Details">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="action-btn btn-edit-student" data-id="${student.id}" title="Edit Student Record">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="action-btn btn-delete-student" data-id="${student.id}" title="Delete Student Record">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </td>
      `;
      studentTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-view-student').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = btn.getAttribute('data-id');
        openStudentDetailsModal(studentId);
      });
    });

    document.querySelectorAll('.btn-edit-student').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = btn.getAttribute('data-id');
        openEditStudentModal(studentId);
      });
    });

    document.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.addEventListener('click', async () => {
        const studentId = btn.getAttribute('data-id');
        if (!studentId) return;
        if (confirm('Delete this student record from Firebase?')) {
          try {
            await window.StudentDB.removeStudent(studentId);
            showToast('Student Removed', 'The student record has been deleted.', 'success');
          } catch (error) {
            console.error('Unable to delete student record:', error);
            showToast('Delete Failed', 'The student record could not be deleted.', 'error');
          }
        }
      });
    });
  }

  function openStudentDetailsModal(id) {
    const student = studentRecords.find(s => s.id === id);
    if (!student) return;

    const totalFees = Number(student.fees || 0);
    const feesPaid = Number(student.feesPaid || 0);
    const balance = totalFees - feesPaid;

    document.getElementById('mStudentHeaderId').textContent = `Student Details: ${student.id}`;
    document.getElementById('mStudentNameVal').textContent = student.studentName || 'N/A';
    document.getElementById('mStudentClassVal').textContent = student.className || 'N/A';
    document.getElementById('mStudentFeesVal').textContent = formatCurrency(totalFees);
    document.getElementById('mStudentFeesPaidVal').textContent = formatCurrency(feesPaid);
    document.getElementById('mStudentBalanceVal').textContent = formatCurrency(balance);
    document.getElementById('mStudentAdmissionDateVal').textContent = student.admissionDate ? formatDate(student.admissionDate) : 'N/A';
    document.getElementById('mStudentParentNameVal').textContent = student.parentName || 'N/A';
    document.getElementById('mStudentParentPhoneVal').textContent = student.parentPhone || 'N/A';
    document.getElementById('mStudentNotesVal').textContent = student.notes || '—';

    const mStudentPhoto = document.getElementById('mStudentPhoto');
    const mStudentNoPhoto = document.getElementById('mStudentNoPhoto');

    if (student.photo) {
      mStudentPhoto.src = student.photo;
      mStudentPhoto.style.display = 'block';
      mStudentNoPhoto.style.display = 'none';
    } else {
      mStudentPhoto.style.display = 'none';
      mStudentNoPhoto.style.display = 'flex';
    }

    studentModalOverlay.classList.add('active');
  }

  [btnStudentModalClose, btnStudentModalCloseFooter, studentModalOverlay].forEach(el => {
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el || el !== studentModalOverlay) {
          studentModalOverlay.classList.remove('active');
        }
      });
    }
  });

  // Edit Student Modal Logic
  const editStudentModal = document.getElementById('editStudentModal');
  const btnEditStudentModalClose = document.getElementById('btnEditStudentModalClose');
  const btnEditStudentModalCloseFooter = document.getElementById('btnEditStudentModalCloseFooter');
  const btnSaveEditedStudent = document.getElementById('btnSaveEditedStudent');

  const editStudentId = document.getElementById('editStudentId');
  const editStudentName = document.getElementById('editStudentName');
  const editStudentClass = document.getElementById('editStudentClass');
  const editStudentFees = document.getElementById('editStudentFees');
  const editStudentFeesPaid = document.getElementById('editStudentFeesPaid');
  const editStudentBalance = document.getElementById('editStudentBalance');
  const editParentName = document.getElementById('editParentName');
  const editParentPhone = document.getElementById('editParentPhone');
  const editAdmissionDate = document.getElementById('editAdmissionDate');
  const editStudentPhotoInput = document.getElementById('editStudentPhotoInput');
  const editNotes = document.getElementById('editNotes');

  function updateEditBalance() {
    const total = Number(editStudentFees.value || 0);
    const paid = Number(editStudentFeesPaid.value || 0);
    const balance = total - paid;
    editStudentBalance.textContent = formatCurrency(balance);
    if (balance > 0) {
      editStudentBalance.style.color = 'var(--brand)';
    } else {
      editStudentBalance.style.color = 'var(--success)';
    }
  }

  [editStudentFees, editStudentFeesPaid].forEach(input => {
    input?.addEventListener('input', updateEditBalance);
  });

  function openEditStudentModal(id) {
    const student = studentRecords.find(s => s.id === id);
    if (!student) return;

    editStudentId.value = student.id;
    editStudentName.value = student.studentName || '';
    editStudentClass.value = student.className || '';
    editStudentFees.value = student.fees || 0;
    editStudentFeesPaid.value = student.feesPaid || 0;
    editParentName.value = student.parentName || '';
    editParentPhone.value = student.parentPhone || '';
    editAdmissionDate.value = student.admissionDate || '';
    editNotes.value = student.notes || '';
    editStudentPhotoInput.value = '';

    updateEditBalance();
    editStudentModal.classList.add('active');
  }

  [btnEditStudentModalClose, btnEditStudentModalCloseFooter, editStudentModal].forEach(el => {
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el || el !== editStudentModal) {
          editStudentModal.classList.remove('active');
        }
      });
    }
  });

  btnSaveEditedStudent?.addEventListener('click', async () => {
    const id = editStudentId.value;
    const name = editStudentName.value.trim();
    const className = editStudentClass.value.trim();
    const fees = Number(editStudentFees.value || 0);
    const feesPaid = Number(editStudentFeesPaid.value || 0);
    const parentName = editParentName.value.trim();
    const parentPhone = editParentPhone.value.trim();
    const admissionDate = editAdmissionDate.value;
    const notes = editNotes.value.trim();
    const file = editStudentPhotoInput?.files?.[0];

    if (!name || !className) {
      showToast('Missing Student Details', 'Please provide student name and class.', 'error');
      return;
    }

    const updates = {
      studentName: name,
      className,
      fees,
      feesPaid,
      parentName,
      parentPhone,
      admissionDate,
      notes
    };

    try {
      if (file) {
        const compressed = await compressImage(file, 400, 400, 0.7);
        updates.photo = compressed;
      }
      await window.StudentDB.updateStudent(id, updates);
      editStudentModal.classList.remove('active');
      showToast('Student Updated', 'The student record has been updated.', 'success');
    } catch (error) {
      console.error('Unable to update student record:', error);
      showToast('Update Failed', 'The student record could not be updated.', 'error');
    }
  });

  async function clearAllStudents() {
    if (!window.StudentDB || typeof window.StudentDB.clearAllStudents !== 'function') {
      showToast('Student system is still loading', 'Please wait a moment and try again.', 'error');
      return;
    }

    if (!confirm('Delete every student record from Firebase?')) return;

    try {
      await window.StudentDB.clearAllStudents();
      showToast('Student Database Cleared', 'All student records were removed.', 'success');
    } catch (error) {
      console.error('Unable to clear student records:', error);
      showToast('Clear Failed', 'The student records could not be cleared.', 'error');
    }
  }

  function renderToppersTable() {
    if (!topperTableBody) return;

    const toppers = window.DB.getToppers();
    topperTableBody.innerHTML = '';

    if (toppers.length === 0) {
      topperTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-table-placeholder">
            <div>No topper highlights have been added yet.</div>
          </td>
        </tr>
      `;
      return;
    }

    toppers.forEach(topper => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${topper.image}" alt="${topper.name}" style="width:72px; height:72px; object-fit:cover; border-radius: .75rem; border: 1px solid var(--border);" /></td>
        <td style="font-weight: 600;">${topper.name}</td>
        <td>${topper.class}</td>
        <td>${topper.marks}</td>
        <td>
          <button class="action-btn btn-delete" data-id="${topper.id}" title="Delete Topper">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </td>
      `;
      topperTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const topperId = btn.getAttribute('data-id');
        if (confirm('Delete this topper entry?')) {
          window.DB.deleteTopper(topperId);
          renderToppersTable();
          showToast('Topper Removed', 'The topper entry has been deleted.', 'success');
        }
      });
    });
  }

  // Open Details Modal and populate values
  async function openDetailsModal(id) {
    const raw = window.DB.getApplicationById(id);
    const app = (raw && typeof raw.then === 'function') ? await raw : raw;
    if (!app) return;

    // Set Text Contents
    document.getElementById('mHeaderId').textContent = `Application Details: ${app.id}`;
    document.getElementById('mStudentName').textContent = app.studentName;
    document.getElementById('mDob').textContent = formatDate(app.dob);
    document.getElementById('mGender').textContent = app.gender;
    document.getElementById('mClass').textContent = app.classApplying;
    document.getElementById('mParentName').textContent = app.parentName;
    document.getElementById('mPhone').textContent = app.parentPhone;
    document.getElementById('mEmail').textContent = app.email;
    document.getElementById('mPrevSchool').textContent = app.prevSchool || 'N/A';
    document.getElementById('mAddress').textContent = app.address;
    
    // File upload data details
    const mDocName = document.getElementById('mDocName');
    const mDocMeta = document.getElementById('mDocMeta');
    
    mDocName.textContent = app.docName;
    mDocMeta.textContent = `${app.docType.split('/')[1].toUpperCase()} • ${formatBytes(app.docSize)}`;
    
    // Bind modal viewer action
    btnModalViewDoc.onclick = () => {
      alert(`[SIMULATION] Viewing File Document: ${app.docName}\nType: ${app.docType}\nSize: ${formatBytes(app.docSize)}`);
    };

    // Bind status tracking redirection
    btnModalTrack.onclick = () => {
      window.open(`status.html?id=${app.id}`, '_blank');
    };

    // Activate modal dialog
    modalOverlay.classList.add('active');
  }

  // Close modals click triggers
  [btnModalClose, btnModalCloseFooter, modalOverlay].forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || el !== modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  });

  // Calculate top totals metrics panels counts
  async function calculateStatsMetrics() {
    const rawList = window.DB.getApplications();
    const list = Array.isArray(rawList) ? rawList : (await rawList) || [];
    
    const total = list.length;
    const pending = list.filter(a => a && a.status === 'pending').length;
    const approved = list.filter(a => a && a.status === 'approved').length;
    const rejected = list.filter(a => a && a.status === 'rejected').length;
    
    statTotal.textContent = total;
    statPending.textContent = pending;
    statApproved.textContent = approved;
    statRejected.textContent = rejected;
  }

  // Render Contact Messages table
  function renderMessagesTable() {
    messagesTableBody.innerHTML = '';
    const messages = window.DB.getContactMessages();
    
    messagesCount.textContent = messages.length;

    if (clearMessagesBtn) {
      clearMessagesBtn.disabled = messages.length === 0;
      clearMessagesBtn.style.opacity = messages.length === 0 ? '0.5' : '1';
      clearMessagesBtn.style.cursor = messages.length === 0 ? 'not-allowed' : 'pointer';
    }

    if (messages.length === 0) {
      messagesTableBody.innerHTML = '';
      messagesEmptyState.style.display = 'block';
      return;
    }

    messagesEmptyState.style.display = 'none';

    // Sort newest messages first
    messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Populate rows
    messages.forEach(msg => {
      const tr = document.createElement('tr');
      
      const truncatedMessage = msg.message.length > 50 ? msg.message.substring(0, 50) + '...' : msg.message;
      
      tr.innerHTML = `
        <td style="font-weight: 600;">${msg.name}</td>
        <td>${msg.email}</td>
        <td style="font-weight: 500;">${msg.subject}</td>
        <td title="${msg.message}" style="cursor: help; color: var(--text-muted);">${truncatedMessage}</td>
        <td style="font-size: 0.9rem; color: var(--text-muted);">${formatDate(msg.createdAt)} ${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          <div class="table-actions" style="gap: 0.5rem;">
            <button class="action-btn btn-view-message" title="View Full Message" data-id="${msg.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="action-btn btn-delete-message" title="Delete Message" data-id="${msg.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </td>
      `;
      
      messagesTableBody.appendChild(tr);
    });

    // Bind message actions
    bindMessageActions();
  }

  // Bind message action handlers
  function bindMessageActions() {
    // View message click handlers
    document.querySelectorAll('.btn-view-message').forEach(btn => {
      btn.addEventListener('click', () => {
        const msgId = btn.getAttribute('data-id');
        const messages = window.DB.getContactMessages();
        const message = messages.find(m => m.id === msgId);
        
        if (message) {
          alert(`From: ${message.name} (${message.email})\nSubject: ${message.subject}\nDate: ${formatDate(message.createdAt)}\n\nMessage:\n${message.message}`);
          window.DB.markMessageAsRead(msgId);
          renderMessagesTable();
        }
      });
    });

    // Delete message click handlers
    document.querySelectorAll('.btn-delete-message').forEach(btn => {
      btn.addEventListener('click', () => {
        const msgId = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this message?')) {
          deleteMessage(msgId);
        }
      });
    });
  }

  // Delete a message
  function deleteMessage(msgId) {
    let messages = JSON.parse(localStorage.getItem('contact_messages')) || [];
    messages = messages.filter(m => m.id !== msgId);
    localStorage.setItem('contact_messages', JSON.stringify(messages));
    
    showToast('Message Deleted', 'The message has been removed.', 'success');
    renderMessagesTable();
  }

  // Size helper formatter
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Date layout formatter
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-US', options);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(amount || 0));
  }

  // Toast Alerts Generator
  function showToast(title, desc, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let svgIcon = '';
    if (type === 'success') {
      svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (type === 'error') {
      svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon flex-center">${svgIcon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${desc}</div>
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4500);
  }
});
