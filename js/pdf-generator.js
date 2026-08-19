/**
 * School Admission Management System - PDF Generator
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnDownload = document.getElementById('btnDownloadPdf');

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      // Gather application data from the DOM
      const appId = document.getElementById('rAppId').textContent;
      const statusText = document.getElementById('rStatusBadge').textContent;
      const studentName = document.getElementById('rStudentName').textContent;
      const dob = document.getElementById('rDob').textContent;
      const gender = document.getElementById('rGender').textContent;
      const classApplying = document.getElementById('rClass').textContent;
      const parentName = document.getElementById('rParentName').textContent;
      const phone = document.getElementById('rPhone').textContent;
      const email = document.getElementById('rEmail').textContent;
      const prevSchool = document.getElementById('rPrevSchool').textContent;
      const address = document.getElementById('rAddress').textContent;
      const docName = document.getElementById('rDocName').textContent;

      const printWindow = window.open('', '_blank', 'width=800,height=900');

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>GAYATRI JUNIOR & DEGREE COLLEGE Application - ${appId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              line-height: 1.5;
              padding: 40px;
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-box {
              background-color: #2563eb;
              color: white;
              width: 45px;
              height: 45px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 20px;
            }
            .logo-title {
              font-size: 22px;
              font-weight: 700;
              letter-spacing: -0.03em;
            }
            .logo-subtitle {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .receipt-badge {
              text-align: right;
            }
            .app-id {
              font-size: 20px;
              font-weight: 800;
              color: #2563eb;
              margin: 0;
            }
            .app-date {
              font-size: 12px;
              color: #64748b;
              margin-top: 4px;
            }
            .status-banner {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 15px 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .status-title {
              font-size: 13px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
            }
            .status-val {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #2563eb;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              margin-top: 30px;
              margin-bottom: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            td {
              padding: 8px 0;
              font-size: 14px;
              vertical-align: top;
            }
            .label {
              width: 30%;
              color: #64748b;
              font-weight: 500;
            }
            .value {
              width: 70%;
              color: #0f172a;
              font-weight: 600;
            }
            .footer-notes {
              margin-top: 50px;
              border-top: 1px dashed #e2e8f0;
              padding-top: 20px;
              font-size: 11px;
              color: #64748b;
              text-align: center;
            }
            .officer-signatures {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
              padding: 0 40px;
            }
            .sig-line {
              border-top: 1px solid #94a3b8;
              width: 200px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              padding-top: 8px;
              margin-top: 50px;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <div class="logo-box">G</div>
              <div>
                <div class="logo-title">GAYATRI JUNIOR & DEGREE COLLEGE</div>
                <div class="logo-subtitle">Office of Admissions</div>
              </div>
            </div>
            <div class="receipt-badge">
              <div class="app-id">${appId}</div>
              <div class="app-date">Generated on: ${new Date().toLocaleDateString('en-US')}</div>
            </div>
          </div>

          <div class="status-banner">
            <div>
              <span class="status-title">Application Status:</span>
              <span class="status-val">${statusText}</span>
            </div>
            <div>
              <span class="status-title">Academic Session:</span>
              <span class="status-val">2026-2027</span>
            </div>
          </div>

          <div class="section-title">Student Information</div>
          <table>
            <tr>
              <td class="label">Student Full Name:</td>
              <td class="value">${studentName}</td>
            </tr>
            <tr>
              <td class="label">Date of Birth:</td>
              <td class="value">${dob}</td>
            </tr>
            <tr>
              <td class="label">Gender:</td>
              <td class="value">${gender}</td>
            </tr>
            <tr>
              <td class="label">Class Applied For:</td>
              <td class="value">${classApplying}</td>
            </tr>
            <tr>
              <td class="label">Previous School:</td>
              <td class="value">${prevSchool}</td>
            </tr>
          </table>

          <div class="section-title">Parent / Guardian Information</div>
          <table>
            <tr>
              <td class="label">Parent Name:</td>
              <td class="value">${parentName}</td>
            </tr>
            <tr>
              <td class="label">Mobile Number:</td>
              <td class="value">${phone}</td>
            </tr>
            <tr>
              <td class="label">Email Address:</td>
              <td class="value">${email}</td>
            </tr>
            <tr>
              <td class="label">Residential Address:</td>
              <td class="value">${address}</td>
            </tr>
          </table>

          <div class="section-title">Verification Checklist</div>
          <table>
            <tr>
              <td class="label">Uploaded Attachment:</td>
              <td class="value">${docName}</td>
            </tr>
            <tr>
              <td class="label">Physical Copy Verification:</td>
              <td class="value">[ ] Completed &nbsp;&nbsp;&nbsp;&nbsp; [ ] Pending Original Verification</td>
            </tr>
          </table>

          <div class="officer-signatures">
            <div class="sig-line">Parent Signature</div>
            <div class="sig-line">Admissions Director Stamp</div>
          </div>

          <div class="footer-notes">
            This document is a computer-generated admission application log. For official records, please present this certificate in person at GAYATRI JUNIOR & DEGREE COLLEGE.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          <\/script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    });
  }
});

