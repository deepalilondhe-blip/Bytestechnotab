import { chromium } from 'playwright';
import { parseFile } from './parser.js';
import { config } from './config.js';
import dotenv from 'dotenv';
import fs from 'fs';

// ─── Load environment ─────────────────────────────────────────────────────────
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile });

const WP_ADMIN_URL         = process.env.WP_ADMIN_URL  || 'https://staging.bytestechnolab.com/HjiMvLE1D6ycKpE/';
const WP_USERNAME          = process.env.WP_USERNAME   || '';
const WP_PASSWORD          = process.env.WP_PASSWORD   || '';
const WP_EDIT_URL          = process.env.WP_EDIT_URL   || 'https://staging.bytestechnolab.com/wp-admin/post.php?post=38125&action=edit';
const HTTP_BASIC_AUTH_USER = process.env.HTTP_BASIC_AUTH_USER || '';
const HTTP_BASIC_AUTH_PASS = process.env.HTTP_BASIC_AUTH_PASS || '';
const SOURCE_FILE          = process.env.WORD_FILE_PATH || './content.md';
const FRONTEND_VERIFY_URL  = 'https://staging.bytestechnolab.com/services/product-strategy-consulting/';

// ─── CAPTCHA solver ───────────────────────────────────────────────────────────
const wordsToNumbers = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

function solveCaptcha(equationText) {
  const clean = equationText.replace(/=/g, '').replace(/−/g, '-').replace(/-/g, '-').replace(/×/g, '*').replace(/\bx\b/g, '*').replace(/÷/g, '/').trim().toLowerCase();
  let operator = '', parts = [];
  if (clean.includes('+') || clean.includes('plus')) {
    operator = '+'; parts = clean.split(/\+|\bplus\b/);
  } else if (clean.includes('-') || clean.includes('minus')) {
    operator = '-'; parts = clean.split(/-|\bminus\b/);
  } else if (clean.includes('*') || clean.includes('times')) {
    operator = '*'; parts = clean.split(/\*|\btimes\b/);
  } else {
    throw new Error('Unknown operator in captcha: ' + clean);
  }
  const aStr = parts[0].trim();
  const bStr = parts[1].trim();
  const a = wordsToNumbers[aStr] !== undefined ? wordsToNumbers[aStr] : parseInt(aStr, 10);
  const b = wordsToNumbers[bStr] !== undefined ? wordsToNumbers[bStr] : parseInt(bStr, 10);
  if (isNaN(a) || isNaN(b)) throw new Error('Could not parse numbers from captcha: ' + clean);
  if (operator === '+') return a + b;
  if (operator === '-') return a - b;
  if (operator === '*') return a * b;
  return 0;
}

// ─── Clean text (normalise whitespace, strip HTML) ────────────────────────────
function cleanText(text) {
  if (text == null) return '';
  return String(text)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Full word-for-word match check ──────────────────────────────────────────
function isFullMatch(expected, liveBodyClean) {
  const expectedFull = cleanText(expected).toLowerCase();
  if (!expectedFull) return true;
  return liveBodyClean.includes(expectedFull);
}

// ─── Show mismatch popup (all data passed as plain args to avoid scope issues)─
async function showMismatchPopup(page, mismatches) {
  // Build rows in Node.js context (safe)
  const rows = mismatches.map(m =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #333;font-weight:bold;color:#f1c40f;white-space:nowrap">${m.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;color:#e74c3c;max-width:280px;word-wrap:break-word;font-size:12px">
        ${m.live ? m.live.substring(0, 100) : '(not found on page)'}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;color:#2ecc71;max-width:280px;word-wrap:break-word;font-size:12px">
        ${m.expected.substring(0, 100)}
      </td>
    </tr>`
  ).join('');

  const count = mismatches.length;

  // Pass rows AND count as arguments — no Node.js variables referenced inside evaluate
  await page.evaluate(({ rows, count }) => {
    const existing = document.getElementById('cross-verify-popup');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'cross-verify-popup';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100vw;height:100vh;
      background:rgba(0,0,0,0.88);z-index:999999;
      display:flex;align-items:center;justify-content:center;
      font-family:Arial,sans-serif;
    `;
    overlay.innerHTML = `
      <div style="background:#1e1e2e;border:2px solid #e74c3c;border-radius:12px;
                  padding:30px;max-width:940px;width:96%;max-height:82vh;overflow-y:auto;
                  box-shadow:0 0 40px rgba(231,76,60,0.6)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h2 style="color:#e74c3c;margin:0;font-size:20px">
            ⚠️ Content Mismatch — ${count} Field(s) Need Update
          </h2>
          <span style="color:#888;font-size:12px">${new Date().toLocaleString()}</span>
        </div>
        <p style="color:#aaa;margin-bottom:18px;font-size:13px">
          Fields below do not match the Google Doc. WordPress editor will open automatically.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#2a2a3e">
              <th style="padding:10px 12px;text-align:left;color:#fff">Field</th>
              <th style="padding:10px 12px;text-align:left;color:#e74c3c">Live Frontend</th>
              <th style="padding:10px 12px;text-align:left;color:#2ecc71">Expected (Doc)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px;text-align:center">
          <div style="background:#e74c3c;color:#fff;padding:10px 30px;
                      border-radius:6px;display:inline-block;font-size:14px;font-weight:bold">
            🔄 Opening WordPress editor in 4 seconds...
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }, { rows, count });

  console.log('  → Popup shown on screen. Waiting 4 seconds...');
  await page.waitForTimeout(4000);
}

// ─── Show success popup ───────────────────────────────────────────────────────
async function showSuccessPopup(page, message) {
  await page.evaluate((msg) => {
    const existing = document.getElementById('cross-verify-popup');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'cross-verify-popup';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100vw;height:100vh;
      background:rgba(0,0,0,0.88);z-index:999999;
      display:flex;align-items:center;justify-content:center;
      font-family:Arial,sans-serif;
    `;
    overlay.innerHTML = `
      <div style="background:#1e1e2e;border:2px solid #27ae60;border-radius:12px;
                  padding:40px 50px;text-align:center;
                  box-shadow:0 0 40px rgba(39,174,96,0.5)">
        <div style="font-size:56px;margin-bottom:16px">✅</div>
        <h2 style="color:#27ae60;margin:0 0 12px;font-size:22px">${msg}</h2>
        <p style="color:#aaa;font-size:14px;margin:0">
          All titles, subtitles and descriptions match the Google Doc exactly.
        </p>
        <p style="color:#666;font-size:12px;margin-top:12px">${new Date().toLocaleString()}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }, message);
  await page.waitForTimeout(4000);
}

// ─── Login to WordPress ───────────────────────────────────────────────────────
async function loginToWordPress(page) {
  await page.goto(WP_ADMIN_URL, { waitUntil: 'load' });
  const isLoginVisible = await page.waitForSelector('#user_login', { timeout: 8000 }).then(() => true).catch(() => false);
  if (isLoginVisible) {
    console.log('  Login form found. Logging in...');
    await page.fill('#user_login', WP_USERNAME);
    await page.fill('#user_pass', WP_PASSWORD);
    const captchaLabel = page.locator('.login .math-captcha-equation, .math-captcha label, label[for="jetpack_protect_answer"], .aiowps-captcha-equation, label[for="math_captcha"]');
    if (await captchaLabel.count() > 0) {
      const text = await captchaLabel.first().textContent();
      console.log(`  Found captcha: "${text}"`);
      try {
        const solution = solveCaptcha(text);
        console.log(`  Solving captcha: "${text}" = ${solution}`);
        const captchaInput = page.locator('input[type="text"][name*="captcha"], input[type="number"][name*="captcha"], input[type="text"][id*="captcha"], input[type="number"][id*="captcha"], input[name="jetpack_protect_num"], input.aiowps-captcha-answer');
        if (await captchaInput.count() > 0) {
          await captchaInput.first().fill(solution.toString());
        }
      } catch (e) {
        console.log('  Failed to parse captcha:', e.message);
      }
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
async function updateMismatchedFields(page, mismatches) {
  console.log('\n  Navigating to WordPress editor...');
  await page.goto(WP_EDIT_URL, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  // Handle post-lock dialog
  const lockDialog = page.locator('#post-lock-dialog');
  if (await lockDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  Post lock dialog detected. Taking over...');
    await page.locator('#post-lock-dialog .button-primary').click();
    await page.waitForTimeout(1500);
  }

  console.log(`\n  Updating ${mismatches.length} field(s):\n`);

  for (const field of mismatches) {
    const locator = page.locator(field.selector);
    const count   = await locator.count();

    if (count > 0) {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(200);

      const isVisible = await locator.isVisible();

      if (isVisible) {
        await locator.click({ force: true }).catch(() => {});
        await locator.fill('');                // clear first
        await locator.fill(field.expected);   // fill exact doc value
      } else {
        // Hidden/collapsed — write via JS and fire input/change events
        await locator.evaluate((el, val) => {
          el.value = val;
          el.dispatchEvent(new Event('input',  { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, field.expected);
      }
      await page.waitForTimeout(200);

      console.log(`  ✓ Updated: ${field.name}`);
    } else {
      console.log(`  ⚠️  Selector not found: ${field.name}`);
    }
  }

  // ── Save: remove backdrops, then DOM-click save + wait for navigation ──
  console.log('\n  Saving page in WordPress...');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // Remove stuck media modal backdrops
  await page.evaluate(() => {
    document.querySelectorAll('.media-modal-backdrop').forEach(el => el.remove());
    document.querySelectorAll('.media-modal').forEach(el => { el.style.display = 'none'; });
  });
  await page.waitForTimeout(500);

  // DOM-click save and wait for WP to navigate to the success page
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
      page.evaluate(() => {
        const btn = document.querySelector('#publish, #save-post');
        if (btn) btn.click();
      })
    ]);
    const savedUrl = page.url();
    const isSaved = savedUrl.includes('message=1') || savedUrl.includes('message=6') || savedUrl.includes('action=edit');
    console.log(isSaved ? '  ✓ Page saved successfully!' : '  ⚠️  Save may have completed (URL check unclear).');
  } catch (e) {
    console.log('  ⚠️  Save navigation timeout — page may still have saved.');
  }
}

// ─── Extract ALL text from frontend (including hidden/carousel elements) ──────
// Uses textContent (not innerText) to capture text inside hidden tabs,
// accordions, carousels, and JS-rendered components that innerText misses.
async function getLiveBodyText(page, url) {
  console.log(`  Loading: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000); // wait for JS-rendered content

  const raw = await page.evaluate(() => {
    // Walk all text nodes including hidden ones
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const tag = node.parentElement?.tagName?.toLowerCase();
          // Skip script/style/noscript nodes
          if (['script','style','noscript','meta'].includes(tag)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (t.length > 1) texts.push(t);
    }
    return texts.join(' ');
  });
  return cleanText(raw).toLowerCase();
}

// ─── Run field comparison and return mismatches ───────────────────────────────
function compareFields(allFields, liveBodyClean) {
  const mismatches = [];
  let matchCount = 0;
  for (const field of allFields) {
    const matched = isFullMatch(field.expected, liveBodyClean);
    if (matched) {
      console.log(`  ✅ MATCH    → ${field.name}`);
      matchCount++;
    } else {
      console.log(`  ❌ MISMATCH → ${field.name}`);
      console.log(`     Expected : "${field.expected.substring(0, 100)}"`);
      mismatches.push({ ...field, live: '(not found on page)' });
    }
  }
  return { mismatches, matchCount };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('');
  console.log('==================================================');
  console.log(' Bytes — Cross-Verify & Auto-Update');
  console.log('==================================================');
  console.log(` Frontend URL : ${FRONTEND_VERIFY_URL}`);
  console.log(` Source Doc   : ${SOURCE_FILE}`);
  console.log('==================================================\n');

  // ── STEP 1: Parse Google Doc ──────────────────────────────────────────────
  console.log('STEP 1 ▶ Parsing Google Doc...');
  const parsedData = await parseFile(SOURCE_FILE);
  console.log('  ✓ Document parsed successfully.\n');

  // Build all 15 fields (title + subtitle + description for every section)
  const allFields = [];
  const fields = config.selectors.fields;
  const addField = (name, key1, key2) => {
    const cfg = fields[key1]?.[key2];
    const val = parsedData[key1]?.[key2];
    if (cfg && val) allFields.push({ name, selector: cfg.selector, expected: cleanText(val) });
  };

  addField('Banner Title',              'banner',         'title');
  addField('Banner Subtitle',           'banner',         'subtitle');
  addField('Banner Bottom Right Title', 'banner',         'bottomRightTitle');
  addField('Build MVP Left Title',      'buildMvp',       'leftTitle');
  addField('Build MVP Left Subtitle',   'buildMvp',       'leftSubtitle');
  addField('Build MVP Right Title',     'buildMvp',       'rightTitle');
  addField('Service Include Title',     'serviceInclude', 'title');
  addField('Service Include Subtitle',  'serviceInclude', 'subtitle');
  addField('We Follow Title',           'weFollow',       'title');
  addField('We Follow Subtitle',        'weFollow',       'subtitle');
  addField('Step Process Title',        'stepProcess',    'title');
  addField('Step Process Description',  'stepProcess',    'description');
  addField('We Cover Title',            'weCover',        'title');
  addField('We Cover Subtitle',         'weCover',        'subtitle');
  addField('Technologies Title',        'technologies',   'title');
  addField('Technologies Subtitle',     'technologies',   'subtitle');

  // ── Build MVP Right Subtitle bullet items (repeater) ──────────────────────
  const challenges = parsedData.buildMvp?.challenges || [];
  const rightSubPattern = config.selectors.fields.buildMvp?.rightSubtitleRepeaterPattern;
  challenges.forEach((item, n) => {
    if (rightSubPattern && item) {
      allFields.push({
        name: `Build MVP Right Subtitle ${n + 1}`,
        selector: '#' + rightSubPattern.replace('{N}', n),
        expected: cleanText(item)
      });
    }
  });

  // ── Service Include repeater items ─────────────────────────────────────────
  const services = parsedData.serviceInclude?.services || [];
  const svcTitlePattern = config.selectors.fields.serviceInclude?.serviceRepeaterTitlePattern;
  const svcSubPattern   = config.selectors.fields.serviceInclude?.serviceRepeaterSubtitlePattern;
  services.forEach((svc, n) => {
    if (svcTitlePattern && svc.title) {
      allFields.push({
        name: `Service Item ${n + 1} Title`,
        selector: '#' + svcTitlePattern.replace('{N}', n),
        expected: cleanText(svc.title)
      });
    }
    if (svcSubPattern && svc.subtitle) {
      allFields.push({
        name: `Service Item ${n + 1} Subtitle`,
        selector: '#' + svcSubPattern.replace('{N}', n),
        expected: cleanText(svc.subtitle)
      });
    }
  });

  // ── We Follow points repeater items ────────────────────────────────────────
  const points = parsedData.weFollow?.points || [];
  const pointTitlePattern = config.selectors.fields.weFollow?.pointsRepeaterTitlePattern;
  const pointSubPattern   = config.selectors.fields.weFollow?.pointsRepeaterSubtitlePattern;
  points.forEach((pt, n) => {
    if (pointTitlePattern && pt.title) {
      allFields.push({
        name: `We Follow Point ${n + 1} Title`,
        selector: '#' + pointTitlePattern.replace('{N}', n),
        expected: cleanText(pt.title)
      });
    }
    if (pointSubPattern && pt.subtitle) {
      allFields.push({
        name: `We Follow Point ${n + 1} Subtitle`,
        selector: '#' + pointSubPattern.replace('{N}', n),
        expected: cleanText(pt.subtitle)
      });
    }
  });

  // ── Industry Specific section header ──────────────────────────────────────
  const indFields = config.selectors.fields.industrySpecific;
  if (indFields?.title?.selector && parsedData.industrySpecific?.title) {
    allFields.push({
      name: 'Industry Section Title',
      selector: indFields.title.selector,
      expected: cleanText(parsedData.industrySpecific.title)
    });
  }

  // ── Industry Specific repeater items ──────────────────────────────────────
  const industries = parsedData.industrySpecific?.industries || [];
  const indTitlePattern = config.selectors.fields.industrySpecific?.industryRepeaterTitlePattern;
  const indSubPattern   = config.selectors.fields.industrySpecific?.industryRepeaterSubtitlePattern;
  industries.forEach((ind, n) => {
    if (indTitlePattern && ind.title) {
      allFields.push({
        name: `Industry ${n + 1} Title`,
        selector: '#' + indTitlePattern.replace('{N}', n),
        expected: cleanText(ind.title)
      });
    }
    if (indSubPattern && ind.subtitle) {
      allFields.push({
        name: `Industry ${n + 1} Subtitle`,
        selector: '#' + indSubPattern.replace('{N}', n),
        expected: cleanText(ind.subtitle)
      });
    }
  });

  // ── Step Process repeater items ────────────────────────────────────────────
  const steps = parsedData.stepProcess?.steps || [];
  const stepTitlePattern = config.selectors.fields.stepProcess?.stepRepeaterTitlePattern;
  const stepDescPattern  = config.selectors.fields.stepProcess?.stepRepeaterDescriptionPattern;
  steps.forEach((step, n) => {
    if (stepTitlePattern && step.title) {
      allFields.push({
        name: `Step ${n + 1} Title`,
        selector: '#' + stepTitlePattern.replace('{N}', n),
        expected: cleanText(step.title)
      });
    }
    if (stepDescPattern && step.description) {
      allFields.push({
        name: `Step ${n + 1} Description`,
        selector: '#' + stepDescPattern.replace('{N}', n),
        expected: cleanText(step.description)
      });
    }
  });

  // ── STEP 2: Launch browser ────────────────────────────────────────────────
  console.log('STEP 2 ▶ Launching Chrome browser...\n');
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
    contextOptions.httpCredentials = { username: HTTP_BASIC_AUTH_USER, password: HTTP_BASIC_AUTH_PASS };
  }

  const context = await browser.newContext(contextOptions);
  const page    = await context.newPage();

  try {

    // ── STEP 3: Open frontend URL and compare all fields ──────────────────
    console.log('STEP 3 ▶ Loading live frontend URL...');
    const liveBodyClean = await getLiveBodyText(page, FRONTEND_VERIFY_URL);

    console.log('\nSTEP 4 ▶ Full word-for-word comparison (all titles, subtitles, descriptions):\n');
    const { mismatches, matchCount } = compareFields(allFields, liveBodyClean);

    console.log('\n--------------------------------------------------');
    console.log(`  Total Fields  : ${allFields.length}`);
    console.log(`  ✅ Matched    : ${matchCount}`);
    console.log(`  ❌ Mismatched : ${mismatches.length}`);
    console.log('--------------------------------------------------\n');

    // Save report
    const reportDir = './reports';
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = `${reportDir}/cross_verify_${ts}.txt`;
    const reportLines = [
      '=== BYTES CROSS-VERIFICATION REPORT ===',
      `Frontend URL : ${FRONTEND_VERIFY_URL}`,
      `Source Doc   : ${SOURCE_FILE}`,
      `Date         : ${new Date().toLocaleString()}`,
      '',
      ...allFields.map(f => {
        const matched = isFullMatch(f.expected, liveBodyClean);
        return `[${matched ? '✅ MATCH' : '❌ MISMATCH'}] ${f.name}\n  Expected: "${f.expected}"\n`;
      }),
      '',
      `Total: ${allFields.length}  Match: ${matchCount}  Mismatch: ${mismatches.length}`,
      `Status: ${mismatches.length === 0 ? 'ALL FIELDS SYNCED ✅' : 'UPDATES REQUIRED ❌'}`
    ];
    fs.writeFileSync(reportFile, reportLines.join('\n'));
    console.log(`  Report saved: ${reportFile}\n`);

    if (mismatches.length === 0) {
      // ── All good — show green popup ──
      console.log('✅ All fields match the live frontend! No update needed.\n');
      await showSuccessPopup(page, 'All Content Is Live & Synced!');

    } else {
      // ── STEP 5: Show mismatch popup ──────────────────────────────────────
      console.log(`STEP 5 ▶ Showing mismatch popup (${mismatches.length} field(s))...`);
      await showMismatchPopup(page, mismatches);

      // ── STEP 6: Login to WordPress ────────────────────────────────────────
      console.log('STEP 6 ▶ Logging into WordPress Admin...');
      await loginToWordPress(page);

      // ── STEP 7: Open editor and update all mismatched fields ──────────────
      console.log('\nSTEP 7 ▶ Updating mismatched fields in WordPress editor...');
      await updateMismatchedFields(page, mismatches);

      // ── STEP 8: Reload frontend URL and re-verify everything ──────────────
      console.log('\nSTEP 8 ▶ Reloading frontend URL to confirm changes are live...');
      const updatedBodyClean = await getLiveBodyText(page, FRONTEND_VERIFY_URL);

      console.log('\n  Final word-for-word check on live page:\n');
      let finalMismatches = 0;
      for (const field of mismatches) {
        const nowLive = isFullMatch(field.expected, updatedBodyClean);
        console.log(`  ${nowLive ? '✅ Now Live' : '❌ Still Missing'} → ${field.name}`);
        if (!nowLive) finalMismatches++;
      }

      console.log('\n--------------------------------------------------');
      if (finalMismatches === 0) {
        console.log(`  ✅ All ${mismatches.length} updated fields are now live on the frontend!`);
        console.log('--------------------------------------------------\n');
        await showSuccessPopup(page, 'All Changes Are Now Live on Frontend!');
      } else {
        console.log(`  ❌ ${finalMismatches} field(s) still not visible on frontend.`);
        console.log('--------------------------------------------------\n');
        const stillMissing = mismatches.filter(f => !isFullMatch(f.expected, updatedBodyClean));
        await showMismatchPopup(page, stillMissing.map(f => ({ ...f, live: '(still not live after save)' })));
      }
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
