import mammoth from 'mammoth';
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Convertible extensions / MIME types ─────────────────────────────────────
const CONVERTIBLE_EXTS  = new Set(['.docx', '.doc']);
const CONVERTIBLE_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

// ─── Locate installed browser (Chrome or Edge) ───────────────────────────────
const BROWSER_CANDIDATES = [
  // Allow an explicit override via environment variable
  process.env.CHROME_PATH,
  // Windows — Chrome
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  // Windows — Edge (always present on Win 10/11)
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  // Linux / CI
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
];

const findBrowser = () => {
  for (const p of BROWSER_CANDIDATES) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
};

// ─── Styled HTML wrapper for clean PDF output ────────────────────────────────
const wrapHtml = (body) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    p  { margin: 0 0 0.6em; }
    h1 { font-size: 1.8em; margin: 0.8em 0 0.4em; }
    h2 { font-size: 1.5em; margin: 0.7em 0 0.3em; }
    h3 { font-size: 1.25em; margin: 0.6em 0 0.3em; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background: #f0f0f0; }
    img { max-width: 100%; }
    ul, ol { padding-left: 1.5em; margin: 0.4em 0 0.8em; }
  </style>
</head>
<body>${body}</body>
</html>`;

/**
 * Attempt to convert an uploaded DOCX/DOC file to PDF.
 *
 * On success:  returns { filename, originalname, converted: true }
 * On skip/err: returns { filename, originalname, converted: false }
 *              (original file is kept as-is)
 *
 * @param {{ path: string, filename: string, originalname: string, mimetype: string }} file
 *        – the req.file object provided by multer
 */
export const convertToPdf = async (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const shouldConvert =
    CONVERTIBLE_EXTS.has(ext) || CONVERTIBLE_MIMES.has(file.mimetype);

  if (!shouldConvert) {
    return { filename: file.filename, originalname: file.originalname, converted: false };
  }

  // ── Step 1: DOCX → HTML via mammoth ────────────────────────────────────────
  let html;
  try {
    const result = await mammoth.convertToHtml({ path: file.path });
    html = wrapHtml(result.value || '<p>(empty document)</p>');
  } catch (err) {
    console.error('[FileConverter] mammoth failed:', err.message);
    return { filename: file.filename, originalname: file.originalname, converted: false };
  }

  // ── Step 2: HTML → PDF via puppeteer-core ──────────────────────────────────
  const browserPath = findBrowser();
  if (!browserPath) {
    console.warn(
      '[FileConverter] No Chrome/Edge found. Set CHROME_PATH env var to enable conversion. ' +
        'Keeping original file.'
    );
    return { filename: file.filename, originalname: file.originalname, converted: false };
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfFilename = file.filename.replace(/\.[^.]+$/, '.pdf');
    const pdfPath = path.join(__dirname, '..', 'uploads', pdfFilename);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: false,
    });

    await browser.close();

    // Remove original DOCX/DOC now that PDF exists
    fs.unlink(file.path, () => {});

    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    console.log(`[FileConverter] Converted "${file.originalname}" → "${baseName}.pdf"`);

    return {
      filename: pdfFilename,
      originalname: `${baseName}.pdf`,
      converted: true,
    };
  } catch (err) {
    console.error('[FileConverter] puppeteer failed:', err.message);
    if (browser) await browser.close().catch(() => {});
    return { filename: file.filename, originalname: file.originalname, converted: false };
  }
};
