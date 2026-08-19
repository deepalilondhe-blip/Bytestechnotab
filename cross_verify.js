import { chromium } from 'playwright';
import { parseFile } from './parser.js';
import { config } from './config.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// ─── Load environment ─────────────────────────────────────────────────────────
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile });

const WP_ADMIN_URL    = process.env.WP_ADMIN_URL  || 'https://staging.bytestechnolab.com/HjiMvLE1D6ycKpE/';
const WP_USERNAME     = process.env.WP_USERNAME   || '';
const WP_PASSWORD     = process.env.WP_PASSWORD   || '';
const WP_EDIT_URL     = process.env.WP_EDIT_URL   || 'https://staging.bytestechnolab.com/wp-admin/post.php?post=38125&action=edit';
const HTTP_BASIC_AUTH_USER = process.env.HTTP_BASIC_AUTH_USER || '';
const HTTP_BASIC_AUTH_PASS = process.env.HTTP_BASIC_AUTH_PASS || '';
const SOURCE_FILE     = process.env.WORD_FILE_PATH || './content.md';

// ─── The live frontend URL to verify against ──────────────────────────────────
const FRONTEND_VERIFY_URL = 'https://staging.bytestechnolab.com/services/product-strategy-consulting/';

// ─── CAPTCHA helper ───────────────────────────────────────────────────────────
const wordsToNumbers = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

function solveCaptcha(equationText) {
  const clean = equationText
    .replace(/=/g, '').replace(/−/g, '-').replace(/–/g, '-')
    .replace(/—/g, '-').replace(/×/g, '*').replace(/\bx\b/g, '*')
    .replace(/÷/g, '/').trim().toLowerCase();

  let operator = '', parts = [];
  if (clean.includes('+') || clean.includes('plus')) {
    operator = '+'; parts = clean.split(/\+|\bplus\b/);
  } else if (clean.includes('-') || clean.includes('minus')) {
    operator = '-'; parts = clean.split(/-|\bminus\b/);
  } else if (clean.includes('*') || clean.includes('times')) {
    operator = '*'; parts = clean.split(/\*|\btimes\b|\bmultiply\b/);
  } else throw new Error(`Unknown operator: ${equationText}`);

  const parseVal = (s) => {
    const t = s.trim();
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    if (wordsToNumbers[t] !== undefined) return wordsToNumbers[t];
    throw new Error(`Could not parse: "${t}"`);
  };
  const v1 = parseVal(parts[0]), v2 = parseVal(parts[1]);
  if (operator === '+') return v1 + v2;
  if (operator === '-') return v1 - v2;
  if (operator === '*') return v1 * v2;
  return 0;
}

// ─── Text cleaner ─────────────────────────────────────────────────────────────
function cleanText(text) {
  if (text == null) return '';
  return String(text)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Similarity check (loose) ─────────────────────────────────────────────────
function isSimilar(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const ca = cleanText(a).toLowerCase();
  const cb = cleanText(b).toLowerCase();
  // Check if either starts with or contains the other (for truncated frontend text)
  if (ca === cb) return true;
  if (ca.includes(cb.substring(0, Math.min(cb.length, 80)))) return true;
  if (cb.includes(ca.substring(0, Math.min(ca.length, 80)))) return true;
  return false;
}

// ─── Show overlay popup on frontend page ─────────────────────────────────────
async function showMismatchPopup(page, mismatches) {
  const rows = mismatches.map(m =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #333;font-weight:bold;color:#f1c40f">${m.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;color:#e74c3c;max-width:300px;word-wrap:break-word">
        ${m.live.substring(0, 120) || '(empty)'}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;color:#2ecc71;max-width:300px;word-wrap:break-word">
        ${m.expected.substring(0, 120)}
      </td>
    </tr>`
  ).join('');

  await page.evaluate((rows) => {
    const overlay = document.createElement('div');
    overlay.id = 'cross-verify-popup';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100vw;height:100vh;
      background:rgba(0,0,0,0.85);z-index:999999;
      display:flex;align-items:center;justify-content:center;
      font-family:Arial,sans-serif;
    `;
    overlay.innerHTML = `
      <div style="background:#1e1e2e;border:2px solid #e74c3c;border-radius:12px;
                  padding:30px;max-width:900px;width:95%;max-height:80vh;overflow-y:auto;
                  box-shadow:0 0 40px rgba(231,76,60,0.6)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h2 style="color:#e74c3c;margin:0;font-size:22px">
            ⚠️ Content Mismatch Detected — ${rows.match(/<tr>/g)?.length || 0} Field(s)
          </h2>
          <span style="color:#888;font-size:13px">${new Date().toLocaleString()}</span>
        </div>
        <p style="color:#aaa;margin-bottom:20px;font-size:14px">
          The following fields on the live frontend URL do not match the Google Doc content.
          The admin panel will now open automatically to update them.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#2a2a3e">
              <th style="padding:10px 12px;text-align:left;color:#fff">Field</th>
              <th style="padding:10px 12px;text-align:left;color:#e74c3c">Live (Frontend)</th>
              <th style="padding:10px 12px;text-align:left;color:#2ecc71">Expected (Doc)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px;text-align:center">
          <div style="background:#e74c3c;color:#fff;padding:10px 30px;
                      border-radius:6px;display:inline-block;font-size:14px">
            🔄 Auto-updating admin panel in 4 seconds...
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }, rows);

  console.log('  → Popup displayed on screen. Waiting 4 seconds...');
  await page.waitForTimeout(4000);
}

// ─── Login to WordPress Admin ─────────────────────────────────────────────────
async function loginToWordPress(page) {
  await page.goto(WP_ADMIN_URL, { waitUntil: 'load' });
  const isLoginVisible = await page.waitForSelector('#user_login', { timeout: 8000 }).then(() => true).catch(() => false);
  if (isLoginVisible) {
    console.log('  Login form found. Logging in...');
    await page.fill('#user_login', WP_USERNAME);
    await page.fill('#user_pass', WP_PASSWORD);

    const captchaLocator = page.locator('.aiowps-captcha-equation');
    if (await captchaLocator.isVisible()) {
      const eq = await captchaLocator.innerText();
      const solution = solveCaptcha(eq);
      console.log(`  Solving captcha: "${eq}" = ${solution}`);
      await page.fill('.aiowps-captcha-answer', solution.toString());
    }

    await page.click('#wp-submit');
    await Promise.race([
      page.waitForSelector('#wpadminbar', { timeout: 30000 }),
      page.waitForSelector('#login_error',  { timeout: 30000 })
    ]);

    if (await page.locator('#login_error').isVisible()) {
      throw new Error('WP login failed: ' + await page.locator('#login_error').innerText());
    }
    console.log('  ✓ WordPress login successful.');
  }
}

// ─── Update mismatched fields in WP editor ────────────────────────────────────
async function updateMismatchedFields(page, mismatches, parsedData) {
  console.log('\n  Navigating to WordPress Editor...');
  await page.goto(WP_EDIT_URL, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  // Handle post-lock dialog
  const lockDialog = page.locator('#post-lock-dialog');
  if (await lockDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  Post lock dialog detected. Taking over...');
    await page.locator('#post-lock-dialog .button-primary').click();
    await page.waitForTimeout(1500);
  }

  console.log(`\n  Updating ${mismatches.length} mismatched field(s)...\n`);

  for (const field of mismatches) {
    const locator = page.locator(field.selector);
    const count = await locator.count();

    if (count > 0) {
      // Scroll into view
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);

      // Highlight orange before update
      await locator.evaluate(el => {
        el.style.outline = '3px solid #f39c12';
        el.style.boxShadow = '0 0 12px #f39c12';
      }).catch(() => {});
      await page.waitForTimeout(400);

      // Fill the field
      const isVisible = await locator.isVisible();
      if (isVisible) {
        await locator.click({ force: true }).catch(() => {});
        await locator.fill(field.expected);
      } else {
        // Hidden field: write directly via JS
        await locator.evaluate((el, val) => { el.value = val; }, field.expected);
      }
      await page.waitForTimeout(200);

      // Highlight green after update
      await locator.evaluate(el => {
        el.style.outline = '3px solid #27ae60';
        el.style.boxShadow = '0 0 12px #27ae60';
      }).catch(() => {});

      console.log(`  ✓ Updated: "${field.name}"`);
    } else {
      console.log(`  ⚠️  Selector not found for: "${field.name}" (${field.selector})`);
    }
  }

  // Save the page
  console.log('\n  Saving page...');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  const saveBtn = page.locator('#publish, #save-post');
  await saveBtn.click({ force: true });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const notice = await page.locator('#message.updated, .notice-success').isVisible().catch(() => false);
  if (notice) {
    console.log('  ✓ Page successfully saved in WordPress!');
  } else {
    console.log('  ⚠️  Save may have completed (notice not detected).');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('==================================================');
  console.log('Bytes Technolab — Cross-Verification & Auto-Update');
  console.log('==================================================');
  console.log(`Frontend URL:  ${FRONTEND_VERIFY_URL}`);
  console.log(`Source Doc:    ${SOURCE_FILE}`);
  console.log('');

  // 1. Parse the Google Doc
  console.log('Step 1: Parsing source document...');
  const parsedData = await parseFile(SOURCE_FILE);
  console.log('  ✓ Document parsed successfully.\n');

  // Build the expected field list from config
  const allFields = [];
  const fields = config.selectors.fields;
  const addField = (name, key1, key2) => {
    const cfg = fields[key1]?.[key2];
    const val = parsedData[key1]?.[key2];
    if (cfg && val) allFields.push({ name, selector: cfg.selector, expected: cleanText(val) });
  };

  addField('Banner Title',             'banner',         'title');
  addField('Banner Subtitle',          'banner',         'subtitle');
  addField('Banner Bottom Right Title','banner',         'bottomRightTitle');
  addField('Build MVP Left Title',     'buildMvp',       'leftTitle');
  addField('Build MVP Left Subtitle',  'buildMvp',       'leftSubtitle');
  addField('Build MVP Right Title',    'buildMvp',       'rightTitle');
  addField('Service Include Title',    'serviceInclude', 'title');
  addField('Service Include Subtitle', 'serviceInclude', 'subtitle');
  addField('We Follow Title',          'weFollow',       'title');
  addField('We Follow Subtitle',       'weFollow',       'subtitle');
  addField('Step Process Title',       'stepProcess',    'title');
  addField('Step Process Description', 'stepProcess',    'description');
  addField('We Cover Title',           'weCover',        'title');
  addField('We Cover Subtitle',        'weCover',        'subtitle');
  addField('Technologies Title',       'technologies',   'title');

  // 2. Launch browser
  console.log('Step 2: Launching Chrome browser...');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled']
  });

  const contextOptions = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 },
    locale: 'en-US'
  };

  if (HTTP_BASIC_AUTH_USER && HTTP_BASIC_AUTH_PASS) {
    contextOptions.httpCredentials = {
      username: HTTP_BASIC_AUTH_USER,
      password: HTTP_BASIC_AUTH_PASS
    };
  }

  const context = await browser.newContext(contextOptions);
  const page    = await context.newPage();

  try {
    // 3. Load live frontend URL
    console.log(`Step 3: Loading live frontend page...`);
    console.log(`  URL: ${FRONTEND_VERIFY_URL}`);
    await page.goto(FRONTEND_VERIFY_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 4. Extract visible text from the page body
    console.log('Step 4: Extracting visible text from live page...');
    const liveBodyText = await page.evaluate(() => document.body.innerText || '');
    const liveBodyClean = cleanText(liveBodyText).toLowerCase();

    // 5. Compare each expected field against live page text
    console.log('\nStep 5: Comparing fields against live content...\n');
    const mismatches = [];
    let matchCount = 0;

    for (const field of allFields) {
      const expected = field.expected;
      // Check first 80 chars of expected text visible on page
      const snippet = expected.substring(0, 80).toLowerCase().replace(/\s+/g, ' ').trim();
      const found = liveBodyClean.includes(snippet);

      if (found) {
        console.log(`  ✓ MATCH     → ${field.name}`);
        matchCount++;
      } else {
        console.log(`  ❌ MISMATCH → ${field.name}`);
        console.log(`     Expected: "${expected.substring(0, 80)}..."`);
        mismatches.push({
          name: field.name,
          selector: field.selector,
          expected: expected,
          live: '(not found in frontend)'
        });
      }
    }

    // 6. Summary
    console.log('\n--------------------------------------------------');
    console.log(`  Total Fields: ${allFields.length}`);
    console.log(`  ✓ Matched:    ${matchCount}`);
    console.log(`  ❌ Mismatch:  ${mismatches.length}`);
    console.log('--------------------------------------------------\n');

    // Save report
    const reportDir = './reports';
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const reportFile = `${reportDir}/cross_verify_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    const reportLines = [
      '=== BYTES CROSS-VERIFICATION REPORT ===',
      `Frontend URL: ${FRONTEND_VERIFY_URL}`,
      `Source Doc:   ${SOURCE_FILE}`,
      `Date:         ${new Date().toLocaleString()}`,
      '',
      ...allFields.map(f => {
        const snippet = f.expected.substring(0, 80).toLowerCase().replace(/\s+/g, ' ').trim();
        const found = liveBodyClean.includes(snippet);
        return `[${found ? '✓ MATCH' : '❌ MISMATCH'}] ${f.name}\n  Expected: "${f.expected.substring(0, 100)}"\n`;
      }),
      '',
      `Total: ${allFields.length}  Match: ${matchCount}  Mismatch: ${mismatches.length}`,
      `Status: ${mismatches.length === 0 ? 'ALL FIELDS SYNCED ✓' : 'UPDATES REQUIRED ❌'}`
    ];
    fs.writeFileSync(reportFile, reportLines.join('\n'));
    console.log(`  Report saved to: ${reportFile}`);

    if (mismatches.length === 0) {
      // All good!
      console.log('\n✅ All fields match the live frontend. No update needed!\n');

      // Show green success popup
      await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position:fixed;top:20px;right:20px;background:#27ae60;color:#fff;
          padding:20px 30px;border-radius:10px;z-index:999999;
          font-family:Arial,sans-serif;font-size:16px;font-weight:bold;
          box-shadow:0 4px 20px rgba(39,174,96,0.5);
        `;
        overlay.textContent = '✅ All content matches the Google Doc!';
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 4000);
      });
      await page.waitForTimeout(4000);

    } else {
      // Show mismatch popup
      console.log('\n⚠️  Mismatches found! Showing popup notification...');
      await showMismatchPopup(page, mismatches);

      // Login to WP and update
      console.log('\nStep 6: Logging into WordPress Admin...');
      await loginToWordPress(page);

      console.log('\nStep 7: Updating mismatched fields in WP editor...');
      await updateMismatchedFields(page, mismatches, parsedData);
    }

  } catch (err) {
    console.error('\n❌ Error during cross-verification:', err.message);
    if (page) await page.screenshot({ path: './cross_verify_error.png' }).catch(() => {});
  } finally {
    console.log('\nClosing Chrome browser...');
    await browser.close();

    console.log('\n==================================================');
    console.log('✓ Cross-Verification Completed!');
    console.log('==================================================\n');
  }
}

run();
