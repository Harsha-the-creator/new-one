const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const PAGES = [
  'index.html',
  'apply.html',
  'status.html',
  'admin.html',
  'dashboard.html'
];
const BREAKPOINTS = [1366, 1024, 768, 420, 360];
const BASE_DIR = process.argv[2] || path.resolve(__dirname, '..'); // pass workspace root optionally
const OUT_DIR = path.resolve(BASE_DIR, 'screenshots');
const WAIT_AFTER_LOAD = 500; // ms

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const pageFile of PAGES) {
      const pagePath = path.resolve(BASE_DIR, pageFile);
      if (!fs.existsSync(pagePath)) {
        console.warn(`Skipping missing page: ${pageFile}`);
        continue;
      }

      const fileUrl = `file://${pagePath}`;
      const page = await browser.newPage();

      for (const width of BREAKPOINTS) {
        const height = Math.max(800, Math.round(width * 0.7));
        await page.setViewport({ width, height, deviceScaleFactor: 1 });

        // For some pages (admin/dashboard) scripts expect certain globals; allow generous timeout
        await page.goto(fileUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(err => {
          console.warn(`Warning: navigation to ${fileUrl} at ${width}px failed: ${err.message}`);
        });

        // Small additional wait for dynamic content
        await page.waitForTimeout(WAIT_AFTER_LOAD);

        const name = `${path.parse(pageFile).name}_${width}w.png`;
        const outPath = path.resolve(OUT_DIR, name);

        await page.screenshot({ path: outPath, fullPage: true }).catch(err => {
          console.error(`Screenshot failed for ${pageFile} @ ${width}px:`, err.message);
        });

        console.log(`Saved: ${path.relative(BASE_DIR, outPath)}`);
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log('All done. Screenshots are in:', OUT_DIR);
})();
