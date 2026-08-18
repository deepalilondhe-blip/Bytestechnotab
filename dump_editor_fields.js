import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile });

const WP_ADMIN_URL = process.env.WP_ADMIN_URL || 'https://staging.bytestechnolab.com/HjiMvLE1D6ycKpE/';
const WP_USERNAME = process.env.WP_USERNAME || '';
const WP_PASSWORD = process.env.WP_PASSWORD || '';
const HTTP_BASIC_AUTH_USER = process.env.HTTP_BASIC_AUTH_USER || '';
const HTTP_BASIC_AUTH_PASS = process.env.HTTP_BASIC_AUTH_PASS || '';
const WP_EDIT_URL = process.env.WP_EDIT_URL || '';

// Math captcha solver dictionary
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

async function run() {
  console.log('Starting editor field inspector...');
  
  const useCDP = process.env.USE_CDP === 'true';
  let browser, context, page;
  let isConnectedOverCDP = false;
  
  if (useCDP) {
    console.log('Connecting to existing Chrome instance over CDP (port 9222)...');
    try {
      browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = browser.contexts();
      if (contexts.length > 0) {
        context = contexts[0];
        const pages = context.pages();
        page = pages.length > 0 ? pages[0] : await context.newPage();
      } else {
        context = await browser.newContext();
        page = await context.newPage();
      }
      isConnectedOverCDP = true;
    } catch (err) {
      console.warn('Could not connect over CDP. Falling back to launching a new browser window...', err.message);
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
    console.log(`Navigating to login URL: ${WP_ADMIN_URL}`);
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
    let editPageUrl = WP_EDIT_URL;
    
    if (!editPageUrl) {
      console.log(`Locating Pages section in sidebar menu...`);
      const pagesMenu = page.locator('#menu-pages a.wp-has-submenu, #menu-pages a').first();
      if (await pagesMenu.count() > 0) {
        console.log('Found Pages link in sidebar menu. Clicking it...');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'load' }),
          pagesMenu.click()
        ]);
      } else {
        console.log('Sidebar Pages link not found. Navigating to standard URL...');
        await page.goto(`${adminOrigin}/wp-admin/edit.php?post_type=page`, { waitUntil: 'load' });
      }
      
      console.log('Searching for page: "2024 Product Information Management"...');
      await page.fill('#post-search-input', '2024 Product Information Management');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        page.press('#post-search-input', 'Enter')
      ]);
      
      const editLinkLocator = page.locator('.row-actions .edit a, a.row-title').first();
      editPageUrl = await editLinkLocator.getAttribute('href');
    }
    
    if (!editPageUrl) {
      throw new Error("Could not find edit link for the target page.");
    }
    
    const absoluteEditUrl = editPageUrl.startsWith('http') ? editPageUrl : `${adminOrigin}${editPageUrl}`;
    console.log(`Navigating to edit URL: ${absoluteEditUrl}...`);
    await page.goto(absoluteEditUrl, { waitUntil: 'load' });
    console.log('Inside page editor.');
    
    if (true) {
      await page.screenshot({ path: './editor_view.png' });
      
      // Extract inputs, textareas, and select elements along with labels
      console.log('Extracting form elements...');
      const elements = await page.evaluate(() => {
        const results = [];
        // Look for ACF fields
        const acfFields = document.querySelectorAll('.acf-field');
        if (acfFields.length > 0) {
          acfFields.forEach(f => {
            const labelEl = f.querySelector('.acf-label label');
            const label = labelEl ? labelEl.innerText.trim() : 'No Label';
            const input = f.querySelector('input, textarea, select');
            if (input) {
              results.push({
                type: 'ACF Field',
                label: label,
                name: input.getAttribute('name'),
                id: input.getAttribute('id'),
                tag: input.tagName.toLowerCase(),
                inputType: input.getAttribute('type') || ''
              });
            }
          });
        }
        
        // General fallback inputs
        const generalInputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
        generalInputs.forEach(input => {
          const id = input.getAttribute('id');
          const name = input.getAttribute('name');
          // Avoid duplicates
          if (results.some(r => r.name === name || (id && r.id === id))) return;
          
          let label = 'No Label';
          if (id) {
            const labelEl = document.querySelector(`label[for="${id}"]`);
            if (labelEl) label = labelEl.innerText.trim();
          }
          
          results.push({
            type: 'General Input',
            label: label,
            name: name,
            id: id,
            tag: input.tagName.toLowerCase(),
            inputType: input.getAttribute('type') || ''
          });
        });
        
        return results;
      });
      
      let output = '=== DUMPED WP EDITOR FIELDS ===\n\n';
      elements.forEach(el => {
        output += `Type: ${el.type}\n`;
        output += `Label: ${el.label}\n`;
        output += `Tag: <${el.tag}${el.inputType ? ' type="' + el.inputType + '"' : ''}>\n`;
        output += `Name Attribute: ${el.name || 'N/A'}\n`;
        output += `ID Attribute: ${el.id || 'N/A'}\n`;
        output += `Suggested config selector: ${el.id ? '#' + el.id : (el.name ? `${el.tag}[name="${el.name}"]` : 'N/A')}\n`;
        output += '-------------------------------------------\n';
      });
      
      fs.writeFileSync('./wp_fields_dump.txt', output);
      console.log('Saved fields dump to wp_fields_dump.txt');
    } else {
      console.log('Could not find page.');
    }
  } catch (err) {
    console.error('Error during inspection:', err.message);
  } finally {
    await browser.close();
  }
}

run();
