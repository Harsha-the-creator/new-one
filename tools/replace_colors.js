const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, '../css');

const replacements = [
  // Primary brand replacements
  { regex: /#FF4444/gi, replacement: 'var(--brand)' },
  { regex: /#DD3333/gi, replacement: 'var(--brand-hover)' },
  { regex: /#FFE5E5/gi, replacement: 'var(--brand-light)' },
  
  // Danger/Accent replacements
  { regex: /#FF6666/gi, replacement: 'var(--accent)' },
  { regex: /#FF3333/gi, replacement: 'var(--danger)' },
  { regex: /#FFD9D9/gi, replacement: 'var(--danger-light)' },
  { regex: /#f05959/gi, replacement: 'var(--accent-hover)' },
  
  // Background replacements
  { regex: /#F5E5E5/gi, replacement: 'var(--bg-main)' },
  { regex: /#E5D5D5/gi, replacement: 'var(--border)' },
  
  // Text colors
  { regex: /#2D2D2D/gi, replacement: 'var(--text-main)' },
  { regex: /#7A7A7A/gi, replacement: 'var(--text-muted)' },
  { regex: /#A0A0A0/gi, replacement: 'var(--text-light)' },
  { regex: /#404040/gi, replacement: 'var(--primary-light)' },
  
  // Specific gradient and RGBA replacements
  { regex: /#580505/gi, replacement: 'var(--primary)' },
  { regex: /#a69393/gi, replacement: 'var(--primary-light)' },
  { regex: /rgba\(255, 68, 68,/gi, replacement: 'rgba(99, 102, 241,' },
  { regex: /rgba\(255, 255, 255,/gi, replacement: 'rgba(255, 255, 255,' }, // No change here, just noting
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.css') || fullPath.endsWith('.html')) {
      if (file === 'variables.css') continue;
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  }
}

processDirectory(cssDir);
// Also process html files in root
processDirectory(path.join(__dirname, '..'));

console.log("Replacement complete!");
