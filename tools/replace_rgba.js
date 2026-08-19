const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, '../css');

// We need to replace the old Indigo rgba with the new Corporate Blue rgba
const replacements = [
  { regex: /rgba\(99,\s*102,\s*241,/gi, replacement: 'rgba(37, 99, 235,' }, // #2563EB
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.css') || fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated rgba in ${file}`);
      }
    }
  }
}

processDirectory(cssDir);
// Also process html files in root
processDirectory(path.join(__dirname, '..'));

console.log("RGBA replacement complete!");
