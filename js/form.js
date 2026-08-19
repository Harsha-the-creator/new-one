/**
 * School Admission Management System - Form Wizard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  const totalSteps = 4;
  
  // DOM Elements
  const form = document.getElementById('admissionForm');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const progressNodes = document.querySelectorAll('.step-node');
  const progressFill = document.getElementById('progressBarFill');
  const formSteps = document.querySelectorAll('.form-step-content');
  
  // Upload Elements
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('documentUpload');
  const filePreview = document.getElementById('filePreviewCard');
  const previewName = document.getElementById('previewFileName');
  const previewSize = document.getElementById('previewFileSize');
  const btnRemoveFile = document.getElementById('btnRemoveFile');
  
  // File state
  let uploadedFileDetails = null;

  // Initialize progress bar
  updateProgress();

  // Next / Submit Button Click Handlers
  btnNext.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
        updateProgress();
      } else {
        submitApplication();
      }
    } else {
      showToast('Validation Error', 'Please correct the invalid fields before proceeding.', 'error');
    }
  });

  // Previous Button Click Handler
  btnPrev.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
      updateProgress();
    }
  });

  // Display specific step view
  function showStep(step) {
    formSteps.forEach(el => el.classList.remove('active'));
    document.querySelector(`.form-step-content[data-step="${step}"]`).classList.add('active');
    
    // Manage button visibilities
    btnPrev.style.visibility = step === 1 ? 'hidden' : 'visible';
    
    if (step === totalSteps) {
      populateReviewData();
      btnNext.innerHTML = `Submit Application <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
      btnNext.classList.remove('btn-primary');
      btnNext.classList.add('btn-dark');
    } else {
      btnNext.innerHTML = `Next <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
      btnNext.classList.remove('btn-dark');
      btnNext.classList.add('btn-primary');
    }
    
    // Auto scroll to top of card on step change
    document.getElementById('wizardProgressHeader').scrollIntoView({ behavior: 'smooth' });
  }

  // Update progress bar filler UI
  function updateProgress() {
    // Node highlights
    progressNodes.forEach((node, idx) => {
      const stepNum = idx + 1;
      node.classList.remove('active', 'completed');
      
      if (stepNum === currentStep) {
        node.classList.add('active');
      } else if (stepNum < currentStep) {
        node.classList.add('completed');
      }
    });

    // Fill calculation
    const progressPct = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = `${progressPct}%`;
  }

  // Populate Step 4 Summary tables
  function populateReviewData() {
    document.getElementById('rStudentName').textContent = document.getElementById('studentName').value;
    document.getElementById('rDob').textContent = document.getElementById('dob').value;
    document.getElementById('rGender').textContent = document.querySelector('input[name="gender"]:checked').value;
    
    document.getElementById('rParentName').textContent = document.getElementById('parentName').value;
    document.getElementById('rParentPhone').textContent = document.getElementById('parentPhone').value;
    document.getElementById('rEmail').textContent = document.getElementById('email').value;
    document.getElementById('rAddress').textContent = document.getElementById('address').value;
    
    document.getElementById('rClassApplying').textContent = document.getElementById('classApplying').value;
    document.getElementById('rPrevSchool').textContent = document.getElementById('prevSchool').value || 'None';
    document.getElementById('rDocName').textContent = uploadedFileDetails ? uploadedFileDetails.name : 'No file uploaded';
  }

  // Validation Rules
  function validateStep(step) {
    let isValid = true;

    if (step === 1) {
      // Name validation
      const sName = document.getElementById('studentName');
      if (sName.value.trim().length < 2) {
        invalidateField(sName);
        isValid = false;
      } else {
        validateField(sName);
      }

      // Age minimum check (Must be at least 4 years old)
      const dob = document.getElementById('dob');
      if (!dob.value) {
        invalidateField(dob);
        isValid = false;
      } else {
        const birthDate = new Date(dob.value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 4 || age > 20 || isNaN(birthDate.getTime())) {
          invalidateField(dob);
          isValid = false;
        } else {
          validateField(dob);
        }
      }
    }

    if (step === 2) {
      // Parent name validation
      const pName = document.getElementById('parentName');
      if (pName.value.trim().length < 2) {
        invalidateField(pName);
        isValid = false;
      } else {
        validateField(pName);
      }

      // Phone validation (min 7 digits)
      const pPhone = document.getElementById('parentPhone');
      const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im; // basic digits check
      if (pPhone.value.trim().length < 7) {
        invalidateField(pPhone);
        isValid = false;
      } else {
        validateField(pPhone);
      }

      // Email validation
      const email = document.getElementById('email');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value)) {
        invalidateField(email);
        isValid = false;
      } else {
        validateField(email);
      }

      // Address validation
      const address = document.getElementById('address');
      if (address.value.trim().length < 5) {
        invalidateField(address);
        isValid = false;
      } else {
        validateField(address);
      }
    }

    if (step === 3) {
      // Class select
      const classSelect = document.getElementById('classApplying');
      if (!classSelect.value) {
        invalidateField(classSelect);
        isValid = false;
      } else {
        validateField(classSelect);
      }

      // File upload validation
      const uploadError = document.getElementById('uploadErrorMsg');
      if (!uploadedFileDetails) {
        uploadZone.style.borderColor = 'var(--danger)';
        uploadError.style.display = 'block';
        isValid = false;
      } else {
        uploadZone.style.borderColor = 'var(--border)';
        uploadError.style.display = 'none';
      }
    }

    if (step === 4) {
      // Declaration check
      const decl = document.getElementById('declaration');
      const declError = document.getElementById('declErrorMsg');
      if (!decl.checked) {
        declError.style.display = 'block';
        isValid = false;
      } else {
        declError.style.display = 'none';
      }
    }

    return isValid;
  }

  // Set field to invalid layout state
  function invalidateField(element) {
    element.closest('.form-field').classList.add('invalid');
  }

  // Set field to valid layout state
  function validateField(element) {
    element.closest('.form-field').classList.remove('invalid');
  }

  // Drag and Drop files handling
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
    }, false);
  });

  uploadZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (fileInput.files.length > 0) {
      handleFileUpload(fileInput.files[0]);
    }
  });

  // Process selected file
  function handleFileUpload(file) {
    const uploadError = document.getElementById('uploadErrorMsg');
    
    // File validation rules (PDF, PNG, JPG, JPEG)
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpg|jpeg)$/i)) {
      showToast('Invalid File Type', 'Please upload a PDF document or PNG/JPG image.', 'error');
      uploadError.style.display = 'block';
      return;
    }

    if (file.size > maxSize) {
      showToast('File Too Large', 'Maximum file size permitted is 2MB.', 'error');
      uploadError.style.display = 'block';
      return;
    }

    // Success - cache metadata
    uploadedFileDetails = {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size
    };

    // Update preview card details
    previewName.textContent = file.name;
    previewSize.textContent = formatBytes(file.size);
    filePreview.classList.add('active');
    uploadZone.style.display = 'none';
    uploadError.style.display = 'none';
    
    showToast('File Uploaded', `${file.name} loaded successfully.`, 'success');
  }

  // Remove file action click handler
  btnRemoveFile.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    uploadedFileDetails = null;
    filePreview.classList.remove('active');
    uploadZone.style.display = 'block';
  });

  // Submit Application Form Action
  function submitApplication() {
    // Loader pre-screen trigger
    const pageLoader = document.getElementById('pageLoader');
    if (pageLoader) {
      pageLoader.classList.remove('fade-out');
      pageLoader.style.display = 'flex';
      pageLoader.querySelector('.page-loader-text').textContent = 'SUBMITTING FORM...';
    }

    setTimeout(async () => {
      // Gather form values
      const formData = {
        studentName: document.getElementById('studentName').value.trim(),
        dob: document.getElementById('dob').value,
        gender: document.querySelector('input[name="gender"]:checked').value,
        parentName: document.getElementById('parentName').value.trim(),
        parentPhone: document.getElementById('parentPhone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim(),
        classApplying: document.getElementById('classApplying').value,
        prevSchool: document.getElementById('prevSchool').value.trim(),
        docName: uploadedFileDetails.name,
        docType: uploadedFileDetails.type,
        docSize: uploadedFileDetails.size
      };

      // Call database layer and await send status
      const submittedApp = await window.DB.createApplication(formData);

      // Hide Loader
      if (pageLoader) {
        pageLoader.classList.add('fade-out');
        setTimeout(() => {
          pageLoader.style.display = 'none';
        }, 400);
      }

      // Hide wizard elements & show success screen
      document.getElementById('formWizardCard').style.display = 'none';
      document.getElementById('wizardProgressHeader').style.display = 'none';
      
      const successScreen = document.getElementById('successScreen');
      document.getElementById('successAppId').textContent = submittedApp.id;
      document.getElementById('btnSuccessTrack').href = `status.html?id=${submittedApp.id}`;

      successScreen.style.display = 'block';
      successScreen.scrollIntoView({ behavior: 'smooth' });

      if (submittedApp) {
        showToast(
          'Application Submitted',
          `Your application has been received successfully. Application ID: ${submittedApp.id}`,
          'success'
        );
      }


    }, 1500); // Simulated delay to showcase professional spinner
  }

  // Toast UI Generator
  function showToast(title, desc, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon based on type
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

    // Auto delete after 4s
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4500);
  }

  // Size display formatter
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
});
