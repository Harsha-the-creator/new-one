/**
 * School Admission Management System - Status Tracking Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('statusSearchInput');
  const btnSearch = document.getElementById('btnStatusSearch');
  const errorMsg = document.getElementById('statusSearchError');
  const resultCard = document.getElementById('statusResultCard');

  // Results fields elements
  const rAppId = document.getElementById('rAppId');
  const rStatusBadge = document.getElementById('rStatusBadge');
  const rStudentName = document.getElementById('rStudentName');
  const rDob = document.getElementById('rDob');
  const rGender = document.getElementById('rGender');
  const rClass = document.getElementById('rClass');
  const rParentName = document.getElementById('rParentName');
  const rPhone = document.getElementById('rPhone');
  const rEmail = document.getElementById('rEmail');
  const rPrevSchool = document.getElementById('rPrevSchool');
  const rAddress = document.getElementById('rAddress');
  const rDocName = document.getElementById('rDocName');

  // Stepper elements
  const timelineFill = document.getElementById('timelineFill');
  const tNode2 = document.getElementById('tNode2');
  const tCircle2 = document.getElementById('tCircle2');
  const tNode3 = document.getElementById('tNode3');
  const tCircle3 = document.getElementById('tCircle3');

  // Help instructions elements
  const helpBox = document.getElementById('statusHelpBox');
  const helpTitle = document.getElementById('statusHelpTitle');
  const helpDesc = document.getElementById('statusHelpDesc');

  // Trigger search if URL has query parameter ID (e.g. status.html?id=ADM-2026-3941)
  const urlParams = new URLSearchParams(window.location.search);
  const queryId = urlParams.get('id') || urlParams.get('ref');

  if (queryId) {
    searchInput.value = queryId.trim();
    performSearch(queryId.trim());
  }

  // Bind search action clicks
  btnSearch.addEventListener('click', () => {
    const inputVal = searchInput.value.trim();
    if (!inputVal) {
      errorMsg.textContent = 'Please enter an Application ID.';
      errorMsg.style.display = 'block';
      return;
    }
    performSearch(inputVal);
  });

  // Handle enter key press on search box
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnSearch.click();
    }
  });

  // Search execution logic
  function performSearch(appId) {
    errorMsg.style.display = 'none';
    resultCard.style.display = 'none';

    // Query database layer
    const application = window.DB.getApplicationById(appId);

    if (!application) {
      errorMsg.textContent = `No application record found matching ID "${appId}". Please check the ID and try again.`;
      errorMsg.style.display = 'block';
      return;
    }

    // Success - Populate layout fields
    rAppId.textContent = application.id;
    rStudentName.textContent = application.studentName;
    rDob.textContent = formatDate(application.dob);
    rGender.textContent = application.gender;
    rClass.textContent = application.classApplying;
    rParentName.textContent = application.parentName;
    rPhone.textContent = application.parentPhone;
    rEmail.textContent = application.email;
    rPrevSchool.textContent = application.prevSchool || 'N/A';
    rAddress.textContent = application.address;
    rDocName.textContent = application.docName;

    // Update Document link simulated metadata
    rDocName.onclick = () => {
      alert(`[SIMULATION] Viewing Document: ${application.docName}\nType: ${application.docType}\nSize: ${formatBytes(application.docSize)}`);
    };
    rDocName.style.cursor = 'pointer';

    // Clear and adjust status layout colors and timeline checkpoints
    updateStatusTimeline(application.status);

    // Render results grid card
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });
  }

  // Timeline UI rendering adjustments based on status state
  function updateStatusTimeline(status) {
    // Reset classes
    rStatusBadge.className = 'status-badge-large';
    tNode2.className = 't-node';
    tNode3.className = 't-node';
    tCircle2.innerHTML = '2';
    tCircle3.innerHTML = '3';

    helpBox.className = 'status-help-box';

    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    if (status === 'pending') {
      // Badge
      rStatusBadge.textContent = 'Pending Review';
      rStatusBadge.classList.add('pending');

      // Timeline (50% progress fill, step 2 active)
      timelineFill.style.width = '50%';
      tNode2.classList.add('active');

      // Help
      helpBox.classList.add('pending');
      helpTitle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Application Under Verification</span>
      `;
      helpDesc.textContent = 'Our academic office is currently reviewing the child registration details and uploaded certificates. We will notify you via email as soon as a final enrollment status update is processed. No action is required at this time.';

    } else if (status === 'approved') {
      // Badge
      rStatusBadge.textContent = 'Approved';
      rStatusBadge.classList.add('approved');

      // Timeline (100% progress fill, steps 2 & 3 completed)
      timelineFill.style.width = '100%';
      tNode2.classList.add('completed');
      tCircle2.innerHTML = checkIcon;
      tNode3.classList.add('completed');
      tCircle3.innerHTML = checkIcon;

      // Help
      helpBox.classList.add('approved');
      helpTitle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Admission Offer Approved!</span>
      `;
      helpDesc.innerHTML = `Congratulations! GAYATRI JUNIOR & DEGREE COLLEGE has officially approved your child's application. 
      <br><br><strong>Next Steps:</strong>
      <ol style="margin-left: 1.25rem; margin-top: 0.5rem;">
        <li>Download and print a copy of this Application Form using the buttons below.</li>
        <li>Visit the school admin office within 7 business days (Monday – Friday, 9:00 AM – 3:00 PM).</li>
        <li>Present original Birth Certificates and previous school records for physical verification.</li>
        <li>Pay the admission and semester term fees to secure enrollment seat.</li>
      </ol>`;

    } else if (status === 'rejected') {
      // Badge
      rStatusBadge.textContent = 'Application Rejected';
      rStatusBadge.classList.add('rejected');

      // Timeline (100% fill, step 2 done, step 3 is final decision but red warning color)
      timelineFill.style.width = '100%';
      tNode2.classList.add('completed');
      tCircle2.innerHTML = checkIcon;
      tNode3.classList.add('active'); // highlight decision node
      tNode3.style.setProperty('--border', 'var(--danger)'); // visual custom color overrides

      // Help
      helpBox.classList.add('rejected');
      helpTitle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Admission Capacity Reached</span>
      `;
      helpDesc.textContent = 'After assessing the files and comparing current class quotas, we regret to inform you that we are unable to offer enrollment for this applicant for the upcoming academic session. We appreciate your interest in our programs and wish your child the best in their academic future.';
    }
  }

  // Size helper
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Date formatter helper
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-US', options);
  }
});

