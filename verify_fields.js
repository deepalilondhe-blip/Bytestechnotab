import { chromium } from 'playwright';
import { parseFile } from './parser.js';
import { config } from './config.js';
import dotenv from 'dotenv';
import fs from 'fs';
import * as diff from 'diff';

dotenv.config();

const WP_ADMIN_URL = process.env.WP_ADMIN_URL || 'https://staging.bytestechnolab.com/HjiMvLE1D6ycKpE/';
const WP_USERNAME = process.env.WP_USERNAME || '';
const WP_PASSWORD = process.env.WP_PASSWORD || '';
const HTTP_BASIC_AUTH_USER = process.env.HTTP_BASIC_AUTH_USER || '';
const HTTP_BASIC_AUTH_PASS = process.env.HTTP_BASIC_AUTH_PASS || '';
const SEARCH_QUERY = 'Product Strategy';
const SOURCE_FILE = './content.md';

const wordsToNumbers = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

function solveCaptcha(equationText) {
  const clean = equationText
    .replace(/=/g, '')
    .replace(/−/g, '-')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/×/g, '*')
    .replace(/\bx\b/g, '*')
    .replace(/÷/g, '/')
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
    throw new Error(`Unknown operator: ${equationText}`);
  }
  
  const parseVal = (str) => {
    const trimmed = str.trim();
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (wordsToNumbers[trimmed] !== undefined) return wordsToNumbers[trimmed];
    throw new Error(`Could not parse: "${trimmed}"`);
  };
  
  const val1 = parseVal(parts[0]);
  const val2 = parseVal(parts[1]);
  
  if (operator === '+') return val1 + val2;
  if (operator === '-') return val1 - val2;
  if (operator === '*') return val1 * val2;
  return 0;
}

function cleanText(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  console.log('==================================================');
  console.log('Bytes Technolab Headed Cross-Verification Tool');
  console.log('==================================================');
  
  console.log(`Parsing source file: ${SOURCE_FILE}...`);
  const parsedData = await parseFile(SOURCE_FILE);
  
  let browser;
  let context;
  let page;
  let isConnectedOverCDP = false;

  const useCDP = process.env.USE_CDP === 'true';
  if (useCDP) {
    console.log('Connecting to active Chrome browser on port 9222...');
    try {
      browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 3000 });
      isConnectedOverCDP = true;
      context = browser.contexts()[0];
      page = context.pages()[0] || await context.newPage();
    } catch (cdpErr) {
      console.log('No running Chrome browser detected on port 9222. Falling back to launching new browser...');
    }
  }

  if (!isConnectedOverCDP) {
    console.log('Launching a new headed Chrome browser instance...');
    browser = await chromium.launch({
      headless: false,
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
    page = await context.newPage();
  }
  
  try {
    console.log(`Navigating to: ${WP_ADMIN_URL}`);
    await page.goto(WP_ADMIN_URL, { waitUntil: 'load' });
    
    // Auto-login if needed
    const isLoginVisible = await page.waitForSelector('#user_login', { timeout: 5000 }).then(() => true).catch(() => false);
    if (isLoginVisible) {
      console.log('Logging in...');
      await page.fill('#user_login', WP_USERNAME);
      await page.fill('#user_pass', WP_PASSWORD);
      
      const captchaLocator = page.locator('.aiowps-captcha-equation');
      if (await captchaLocator.isVisible()) {
        const solution = solveCaptcha(await captchaLocator.innerText());
        await page.fill('.aiowps-captcha-answer', solution.toString());
      }
      
      await page.click('#wp-submit');
      await Promise.race([
        page.waitForSelector('#wpadminbar', { timeout: 30000 }),
        page.waitForSelector('#login_error', { timeout: 30000 })
      ]);
    }
    
    if (await page.locator('#login_error').isVisible()) {
      throw new Error('Login failed: ' + await page.locator('#login_error').innerText());
    }
    console.log('✓ Logged in successfully.');
    
    const adminOrigin = new URL(WP_ADMIN_URL).origin;
    console.log(`Navigating to Pages list...`);
    await page.goto(`${adminOrigin}/wp-admin/edit.php?post_type=page`, { waitUntil: 'load' });
    
    console.log(`Searching for page: "${SEARCH_QUERY}"...`);
    await page.fill('#post-search-input', SEARCH_QUERY);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.press('#post-search-input', 'Enter')
    ]);
    
    const editLinkLocator = page.locator('.row-actions .edit a, a.row-title').first();
    const editPageUrl = await editLinkLocator.getAttribute('href');
    
    if (!editPageUrl) {
      throw new Error(`Could not find search result page for: "${SEARCH_QUERY}"`);
    }
    
    const absoluteEditUrl = editPageUrl.startsWith('http') ? editPageUrl : `${adminOrigin}${editPageUrl}`;
    console.log(`Found edit URL: ${absoluteEditUrl}. Navigating...`);
    await page.goto(absoluteEditUrl, { waitUntil: 'load' });
    
    console.log('\nRunning cross-verification of fields...\n');
    let report = '=== BYTES FIELD CROSS-VERIFICATION REPORT ===\n\n';
    
    const fieldsToVerify = [
      { name: 'Banner Title', expected: parsedData.banner.title, selector: config.selectors.fields.banner.title.selector },
      { name: 'Banner Subtitle', expected: parsedData.banner.subtitle, selector: config.selectors.fields.banner.subtitle.selector },
      { name: 'Banner Bottom Right Title', expected: parsedData.banner.bottomRightTitle, selector: config.selectors.fields.banner.bottomRightTitle.selector },
      
      { name: 'Build MVP Left Title', expected: parsedData.buildMvp.leftTitle, selector: config.selectors.fields.buildMvp.leftTitle.selector },
      { name: 'Build MVP Left Subtitle', expected: parsedData.buildMvp.leftSubtitle, selector: config.selectors.fields.buildMvp.leftSubtitle.selector },
      { name: 'Build MVP Right Title', expected: parsedData.buildMvp.rightTitle, selector: config.selectors.fields.buildMvp.rightTitle.selector },
      
      { name: 'Service Include Title', expected: parsedData.serviceInclude.title, selector: config.selectors.fields.serviceInclude.title.selector },
      { name: 'Service Include Subtitle', expected: parsedData.serviceInclude.subtitle, selector: config.selectors.fields.serviceInclude.subtitle.selector },
      
      { name: 'We Follow Title', expected: parsedData.weFollow.title, selector: config.selectors.fields.weFollow.title.selector },
      { name: 'We Follow Subtitle', expected: parsedData.weFollow.subtitle, selector: config.selectors.fields.weFollow.subtitle.selector },
      
      { name: 'Step Process Title', expected: parsedData.stepProcess.title, selector: config.selectors.fields.stepProcess.title.selector },
      { name: 'Step Process Description', expected: parsedData.stepProcess.description, selector: config.selectors.fields.stepProcess.description.selector },
      
      { name: 'We Cover Title', expected: parsedData.weCover.title, selector: config.selectors.fields.weCover.title.selector },
      { name: 'We Cover Subtitle', expected: parsedData.weCover.subtitle, selector: config.selectors.fields.weCover.subtitle.selector },
      
      { name: 'Technologies Title', expected: parsedData.technologies.title, selector: config.selectors.fields.technologies.title.selector }
    ];
    
    let mismatchCount = 0;
    for (const field of fieldsToVerify) {
      const locator = page.locator(field.selector);
      let liveValue = '';
      if (await locator.count() > 0) {
        liveValue = await locator.inputValue();
      }
      
      const cleanLive = cleanText(liveValue);
      const cleanExpected = cleanText(field.expected);
      const isMatch = cleanLive.toLowerCase() === cleanExpected.toLowerCase();
      
      const statusText = isMatch ? '✓ MATCH' : '❌ MISMATCH';
      if (!isMatch) mismatchCount++;
      
      console.log(`[${statusText}] ${field.name}`);
      report += `Field: ${field.name}\n`;
      report += `Selector: ${field.selector}\n`;
      report += `WordPress Live: "${cleanLive}"\n`;
      report += `Expected Doc:   "${cleanExpected}"\n`;
      report += `Status:         ${statusText}\n`;
      report += '--------------------------------------------------\n';
    }
    
    report += `\nVerification Summary:\n`;
    report += `Total Fields Checked: ${fieldsToVerify.length}\n`;
    report += `Mismatched Fields:   ${mismatchCount}\n`;
    report += `Status:              ${mismatchCount === 0 ? 'ALL FIELDS SYNCED' : 'CHANGES REQUIRED'}\n`;
    
    fs.writeFileSync('./field_verification_report.txt', report);
    console.log('\nReport successfully saved to field_verification_report.txt');
    
  } catch (err) {
    console.error('Error during field verification:', err.message);
  } finally {
    if (browser) {
      if (isConnectedOverCDP) {
        await browser.close();
      } else {
        console.log('\nVerification complete. Leaving Chrome browser open for you to inspect.');
      }
    }
  }
}

run();
