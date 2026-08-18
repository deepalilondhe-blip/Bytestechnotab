import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import * as diff from 'diff';
import { parseFile } from './parser.js';
import { config } from './config.js';

// Load environment variables
dotenv.config();

const WP_ADMIN_URL = process.env.WP_ADMIN_URL || 'https://staging.bytestechnolab.com/HjiMvLE1D6ycKpE/';
const WP_USERNAME = process.env.WP_USERNAME || '';
const WP_PASSWORD = process.env.WP_PASSWORD || '';
const HTTP_BASIC_AUTH_USER = process.env.HTTP_BASIC_AUTH_USER || '';
const HTTP_BASIC_AUTH_PASS = process.env.HTTP_BASIC_AUTH_PASS || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://staging.bytestechnolab.com/services/product-strategy-consulting/';
const WORD_FILE_PATH = process.env.WORD_FILE_PATH || './Bytes Content Automation.docx';

// ------------------------------------------------------------
// AUTOMATION CONFIGURATION (Adopted from Selenium script)
// ------------------------------------------------------------
const DRY_RUN = process.env.DRY_RUN === 'false' ? false : true; // Default to true (safe)
const MATCH_THRESHOLD = 95;
const REPORT_DIR = './reports';
const SCREENSHOT_DIR = config.options.screenshotDir || './screenshots';

// Ensure directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// Math captcha solver dictionary
const wordsToNumbers = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

/**
 * Clean and normalize text for comparison
 */
function normalizeText(text) {
  if (text == null) return '';
  return String(text)
    .replace(/\u00a0/g, ' ') // Replace non-breaking spaces
    .replace(/\s+/g, ' ')    // Standardize whitespace
    .trim();
}

/**
 * Calculates similarity score using word-based diff comparison
 */
function calculateSimilarity(expected, actual) {
  const normExpected = normalizeText(expected).toLowerCase();
  const normActual = normalizeText(actual).toLowerCase();
  
  if (!normExpected && !normActual) return 100;
  if (!normExpected || !normActual) return 0;
  
  const wordDiff = diff.diffWords(normExpected, normActual);
  let commonChars = 0;
  
  wordDiff.forEach((part) => {
    if (!part.added && !part.removed) {
      commonChars += part.value.length;
    }
  });
  
  const ratio = (2 * commonChars) / (normExpected.length + normActual.length);
  return Math.round(ratio * 10000) / 100;
}

/**
 * Creates visual text diff preview (similar to git diff)
 */
function createDiffPreview(expected, actual) {
  const expectedWords = normalizeText(expected).split(/\s+/);
  const actualWords = normalizeText(actual).split(/\s+/);
  const diffArray = diff.diffArrays(actualWords, expectedWords);
  const lines = [];
  
  diffArray.forEach((part) => {
    if (part.added) lines.push('+ ' + part.value.join(' '));
    if (part.removed) lines.push('- ' + part.value.join(' '));
  });
  
  return lines.join('\n');
}

/**
 * Solves mathematical WordPress login captcha
 */
function solveCaptcha(equationText) {
  console.log(`Solving captcha equation: "${equationText}"`);
  const clean = equationText
    .replace(/=/g, '')
    .replace(/−/g, '-')   // Unicode minus (U+2212)
    .replace(/–/g, '-')   // En dash (U+2013)
    .replace(/—/g, '-')   // Em dash (U+2014)
    .replace(/×/g, '*')   // Unicode multiplication (U+00D7)
    .replace(/\bx\b/g, '*')  // ASCII x as standalone word for multiplication
    .replace(/÷/g, '/')   // Unicode division (U+00F7)
    .trim()
    .toLowerCase();
  
  let operator = '';
  let parts = [];
  
  if (clean.includes('+') || clean.includes('plus')) {
    operator = '+';
    parts = clean.split(/\+|\bplus\b/);
  } else if (clean.includes('-') || clean.includes('minus')) {
    operator = '-';
    parts = clean.split(/-|\bminus\b/);
  } else if (clean.includes('*') || clean.includes('times') || clean.includes('multiply')) {
    operator = '*';
    parts = clean.split(/\*|\btimes\b|\bmultiply\b/);
  } else {
    throw new Error(`Unknown operator in captcha equation: "${equationText}"`);
  }
  
  if (parts.length !== 2) {
    throw new Error(`Failed to split captcha: "${clean}"`);
  }
  
  const parseVal = (str) => {
    const trimmed = str.trim();
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (wordsToNumbers[trimmed] !== undefined) return wordsToNumbers[trimmed];
    throw new Error(`Could not parse number from captcha: "${trimmed}"`);
  };
  
  const val1 = parseVal(parts[0]);
  const val2 = parseVal(parts[1]);
  
  let result = 0;
  if (operator === '+') result = val1 + val2;
  if (operator === '-') result = val1 - val2;
  if (operator === '*') result = val1 * val2;
  
  console.log(`Captcha solved successfully: ${val1} ${operator} ${val2} = ${result}`);
  return result;
}

/**
 * Detects the active WordPress Page Editor type
 */
async function detectEditor(page) {
  console.log('\nDetecting WordPress Page Editor type...');
  
  // Elementor Selectors
  const elementorClasses = ['.elementor-editor-active', '#elementor-panel', '.elementor-panel', '.elementor-editor'];
  for (const selector of elementorClasses) {
    if (await page.locator(selector).first().count().catch(() => 0) > 0) {
      console.log('✓ Elementor detected');
      return 'elementor';
    }
  }
  
  // Gutenberg Selectors
  const gutenbergClasses = ['.block-editor-page', '.editor-styles-wrapper', '.interface-interface-skeleton', '.edit-post-layout'];
  for (const selector of gutenbergClasses) {
    if (await page.locator(selector).first().count().catch(() => 0) > 0) {
      console.log('✓ Gutenberg detected');
      return 'gutenberg';
    }
  }
  
  // Classic Editor (includes hidden textarea #content)
  if (await page.locator('#content').first().count().catch(() => 0) > 0) {
    console.log('✓ Classic Editor detected');
    return 'classic';
  }
  
  console.log('⚠️ Editor type could not be determined. Assuming Gutenberg block-based fallback.');
  return 'unknown';
}

/**
 * Reads content currently loaded inside the editor
 */
async function getEditorContent(page, editorType) {
  console.log(`Reading editor content for type: ${editorType}`);
  try {
    if (editorType === 'classic') {
      const el = page.locator('#content');
      return (await el.inputValue()) || (await el.innerHTML()) || '';
    }
    
    if (editorType === 'tinymce') {
      const frame = page.frameLocator('iframe.wp-editor-area');
      return await frame.locator('body').innerText();
    }
    
    if (editorType === 'gutenberg') {
      const el = page.locator('.editor-styles-wrapper');
      return await el.innerText();
    }
    
    if (editorType === 'elementor') {
      console.log('Elementor active. Widget-level mappings should be checked.');
      return '';
    }
  } catch (err) {
    console.warn(`Error reading editor content: ${err.message}`);
  }
  return '';
}

/**
 * Saves execution report
 */
function saveReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '_').replace('T', '_').slice(0, 19);
  const reportPath = path.join(REPORT_DIR, `bytes_content_report_${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 4), 'utf-8');
  console.log(`\nReport successfully written to: ${reportPath}`);
}

/**
 * Main Run Method
 */
async function run() {
  console.log('==================================================');
  console.log('Bytes Technolab Automation Engine (Playwright)');
  console.log('==================================================');
  console.log(`DRY_RUN mode: ${DRY_RUN}`);

  // 1. Resolve Word/Text content file
  let wordDataFile = WORD_FILE_PATH;
  if (!fs.existsSync(wordDataFile)) {
    if (fs.existsSync('./Bytes Content Automation.docx')) {
      wordDataFile = './Bytes Content Automation.docx';
    } else if (fs.existsSync('./content.md')) {
      wordDataFile = './content.md';
    } else {
      console.error(`❌ Content source document not found at: ${WORD_FILE_PATH}`);
      process.exit(1);
    }
  }

  let parsedData;
  let rawExpectedText = '';
  try {
    console.log(`Reading document: ${wordDataFile}`);
    parsedData = await parseFile(wordDataFile);
    
    // Flatten paragraphs for similarity check
    if (wordDataFile.endsWith('.docx')) {
      const mammothResult = await fs.promises.readFile(wordDataFile);
      // We can extract raw paragraphs just like your friend's code did
      rawExpectedText = normalizeText(fs.readFileSync('./content.md', 'utf8').split('---')[1] || fs.readFileSync('./content.md', 'utf8'));
    } else {
      // It's a text/markdown file
      rawExpectedText = fs.readFileSync(wordDataFile, 'utf8');
    }
  } catch (err) {
    console.error(`❌ Error parsing document content: ${err.message}`);
    process.exit(1);
  }

  // 2. Launch browser (Try CDP connection on port 9222 first, otherwise launch new instance)
  let browser;
  let context;
  let page;
  let isConnectedOverCDP = false;

  console.log('\nChecking for running Chrome instance on port 9222 (remote debugging)...');
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 3000 });
    console.log('✓ Connected successfully to running Chrome browser!');
    isConnectedOverCDP = true;
    context = browser.contexts()[0];
    page = context.pages()[0] || await context.newPage();
  } catch (cdpErr) {
    console.log('No running Chrome browser detected on port 9222. Launching new browser...');
    browser = await chromium.launch({
      headless: config.options.headless,
      channel: 'chrome',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security'
      ]
    });

    const contextOptions = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      deviceScaleFactor: 1
    };

    if (HTTP_BASIC_AUTH_USER && HTTP_BASIC_AUTH_PASS) {
      console.log('Setting HTTP Basic Authentication credentials...');
      contextOptions.httpCredentials = {
        username: HTTP_BASIC_AUTH_USER,
        password: HTTP_BASIC_AUTH_PASS
      };
    }

    context = await browser.newContext(contextOptions);
    
    // Hide webdriver signature
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    page = await context.newPage();
  }

  page.setDefaultTimeout(config.options.timeout);

  const results = [];
  const pageResult = {
    url: FRONTEND_URL,
    word_file: wordDataFile,
    status: 'FAILED',
    frontend_similarity: 0,
    editor: '',
    editor_similarity: 0,
    updated: false,
    verification: '',
    error: ''
  };

  try {
    // 3. Login to WordPress Admin
    console.log(`\nChecking WordPress Admin login status...`);
    await page.goto(WP_ADMIN_URL, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '0_login_page.png') });

    // Check for IP blocks or Cloudflare blocks
    const bodyText = await page.innerText('body').catch(() => '');
    if (bodyText.includes('blocked for security reasons') || bodyText.includes('Access from your IP address has been blocked') || bodyText.includes('you have been blocked') || bodyText.includes('unable to access')) {
      throw new Error("Staging server or Cloudflare blocked our IP address. Please whitelist this IP in WordPress or use a different connection.");
    }

    if (await page.locator(config.selectors.loginUser).isVisible()) {
      console.log('Login form found. Logging in...');
      await page.fill(config.selectors.loginUser, WP_USERNAME);
      await page.fill(config.selectors.loginPass, WP_PASSWORD);

      const captchaLocator = page.locator('.aiowps-captcha-equation');
      if (await captchaLocator.isVisible()) {
        const rawEquation = await captchaLocator.innerText();
        const solution = solveCaptcha(rawEquation);
        await page.fill('.aiowps-captcha-answer', solution.toString());
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '0_login_form_filled.png') });
      await page.click(config.selectors.loginSubmit);

      console.log('Waiting for login response...');
      const loginResult = await Promise.race([
        page.waitForSelector('#wpadminbar', { timeout: 30000 }).then(() => 'success'),
        page.waitForSelector('#login_error', { timeout: 30000 }).then(() => 'error')
      ]).catch(() => 'timeout');

      if (loginResult === 'error') {
        const errorText = await page.locator('#login_error').innerText().catch(() => 'Unknown Login Error');
        throw new Error(`WordPress login failed: ${errorText}`);
      } else if (loginResult === 'timeout') {
        throw new Error('WordPress login timed out (could not detect admin bar or error box)');
      }
    } else {
      console.log('Already logged in or bypassed login form.');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1_dashboard.png') });
    console.log('✓ WordPress login successful.');

    // 4. Open Frontend page
    console.log(`\nNavigating to Frontend website: ${FRONTEND_URL}`);
    await page.goto(FRONTEND_URL, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '2_frontend_page.png') });

    const frontendText = await page.innerText('body');
    const similarity = calculateSimilarity(rawExpectedText, frontendText);
    pageResult.frontend_similarity = similarity;
    console.log(`Content similarity against frontend: ${similarity}%`);

    if (similarity >= MATCH_THRESHOLD) {
      console.log('✓ Overall content similarity is high.');
    } else {
      console.log('⚠️ Website content differs from document. Preparing to edit...');
      const diffPreview = createDiffPreview(rawExpectedText, frontendText);
      console.log('--- Content Difference Preview (First 500 Chars) ---');
      console.log(diffPreview.substring(0, 500));
      console.log('----------------------------------------------------');
    }

    // 5. Navigate to Editor via Frontend Admin Bar (Direct Link Navigation)
    console.log('\nLocating "Edit Page" link in WordPress Admin Bar...');
    const editPageLocator = page.locator('#wpadminbar a:has-text("Edit Page"), #wpadminbar a[href*="post.php?post="]').first();
    
    if (await editPageLocator.isVisible()) {
      const editPageUrl = await editPageLocator.getAttribute('href');
      console.log(`Found edit page URL: ${editPageUrl}`);
      await page.goto(editPageUrl, { waitUntil: 'load' });
    } else {
      console.log('⚠️ Admin bar Edit Page link not visible. Navigating to standard post editor list...');
      const adminOrigin = new URL(WP_ADMIN_URL).origin;
      await page.goto(`${adminOrigin}/wp-admin/edit.php?post_type=page`);
      await page.fill('#post-search-input', 'Product Strategy');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        page.press('#post-search-input', 'Enter')
      ]);
      const editLinkLocator = page.locator('.row-actions .edit a, a.row-title').first();
      const editPageUrl = await editLinkLocator.getAttribute('href');
      if (editPageUrl) {
        const absoluteEditUrl = editPageUrl.startsWith('http') ? editPageUrl : `${adminOrigin}${editPageUrl}`;
        console.log(`Found direct Edit Page URL: ${absoluteEditUrl}. Navigating directly...`);
        await page.goto(absoluteEditUrl, { waitUntil: 'load' });
      } else {
        throw new Error("Could not find Edit Page link in search results.");
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '3_page_editor.png') });
    console.log('✓ Editor page loaded successfully.');

    // 6. Detect Editor and Inspect content
    const editorType = await detectEditor(page);
    pageResult.editor = editorType;

    const editorContent = await getEditorContent(page, editorType);
    const editorSimilarity = calculateSimilarity(rawExpectedText, editorContent);
    pageResult.editor_similarity = editorSimilarity;
    console.log(`Editor similarity: ${editorSimilarity}%`);

    // 7. Handle Dry Run vs Update Mode
    if (DRY_RUN) {
      console.log('\n==================================================');
      console.log('DRY RUN MODE ACTIVE');
      console.log('==================================================');
      console.log('No content will be modified.');
      pageResult.status = 'EDITOR_DETECTED';
      pageResult.verification = 'DRY_RUN_COMPLETED';
    } else {
      console.log('\n==================================================');
      console.log('UPDATE MODE ACTIVE');
      console.log('==================================================');
      console.log('Updating fields in Page Editor...');

      // Field updating helper
      async function updateField(fieldConf, value) {
        if (!value) return;
        console.log(`Setting field: "${fieldConf.label}" -> "${value.substring(0, 35)}..."`);
        
        if (fieldConf.selector && await page.locator(fieldConf.selector).first().isVisible()) {
          await page.fill(fieldConf.selector, value);
          return;
        }
        
        const labelLocator = page.locator(`label:has-text("${fieldConf.label}")`);
        if (await labelLocator.first().isVisible()) {
          const labelFor = await labelLocator.first().getAttribute('for');
          if (labelFor) {
            await page.fill(`#${labelFor}`, value);
            return;
          }
          const container = labelLocator.first().locator('xpath=..');
          const input = container.locator('input, textarea, [contenteditable="true"]').first();
          if (await input.isVisible()) {
            await input.fill(value);
            return;
          }
        }
        console.warn(`Could not locate field for: "${fieldConf.label}"`);
      }

      // Fill in mapped sections
      await updateField(config.selectors.fields.banner.title, parsedData.banner.title);
      await updateField(config.selectors.fields.banner.subtitle, parsedData.banner.subtitle);
      await updateField(config.selectors.fields.banner.bottomRightTitle, parsedData.banner.bottomRightTitle);

      await updateField(config.selectors.fields.buildMvp.leftTitle, parsedData.buildMvp.leftTitle);
      await updateField(config.selectors.fields.buildMvp.leftSubtitle, parsedData.buildMvp.leftSubtitle);
      await updateField(config.selectors.fields.buildMvp.rightTitle, parsedData.buildMvp.rightTitle);
      await updateField(config.selectors.fields.buildMvp.rightSubtitle, parsedData.buildMvp.rightSubtitle);

      await updateField(config.selectors.fields.serviceInclude.title, parsedData.serviceInclude.title);
      await updateField(config.selectors.fields.serviceInclude.subtitle, parsedData.serviceInclude.subtitle);

      await updateField(config.selectors.fields.weFollow.title, parsedData.weFollow.title);
      await updateField(config.selectors.fields.weFollow.subtitle, parsedData.weFollow.subtitle);

      await updateField(config.selectors.fields.stepProcess.title, parsedData.stepProcess.title);
      await updateField(config.selectors.fields.stepProcess.description, parsedData.stepProcess.description);

      await updateField(config.selectors.fields.weCover.title, parsedData.weCover.title);
      await updateField(config.selectors.fields.weCover.subtitle, parsedData.weCover.subtitle);

      await updateField(config.selectors.fields.technologies.title, parsedData.technologies.title);
      if (parsedData.technologies.list.length > 0) {
        const listStr = parsedData.technologies.list.map(t => `* ${t}`).join('\n');
        await updateField(config.selectors.fields.technologies.list, listStr);
      }

      // Save changes
      console.log('\nSaving page modifications...');
      const saveBtn = page.locator(config.selectors.saveButton);
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForLoadState('networkidle');
        console.log('✓ Page successfully updated and saved.');
        pageResult.updated = true;
        pageResult.status = 'SUCCESS';
      } else {
        console.warn('⚠️ Save/Publish button not found.');
      }
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '4_page_saved.png') });
    }

  } catch (err) {
    console.error(`\n❌ Automation error: ${err.message}`);
    pageResult.error = err.message;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') }).catch(() => {});
  } finally {
    console.log('\nClosing browser context...');
    await browser.close();
    
    results.push(pageResult);
    saveReport(results);
    console.log('Done.');
  }
}

run();
