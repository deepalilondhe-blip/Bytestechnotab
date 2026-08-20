import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const WP_ADMIN_URL = process.env.WP_ADMIN_URL || '';
const WP_USERNAME = process.env.WP_USERNAME || '';
const WP_PASSWORD = process.env.WP_PASSWORD || '';
const WP_EDIT_URL = process.env.WP_EDIT_URL || '';

function solveCaptcha(equation) {
  const clean = equation.replace(/=/g, '').replace(/−/g, '-').replace(/–/g, '-').replace(/×/g, '*').replace(/\bx\b/g, '*').replace(/÷/g, '/').trim().toLowerCase();
  let operator = '';
  let parts = [];
  if (clean.includes('+')) { operator = '+'; parts = clean.split('+'); }
  else if (clean.includes('-')) { operator = '-'; parts = clean.split('-'); }
  else if (clean.includes('*')) { operator = '*'; parts = clean.split('*'); }
  
  const wordsToNumbers = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const parseVal = (str) => {
    const trimmed = str.trim();
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (wordsToNumbers[trimmed] !== undefined) return wordsToNumbers[trimmed];
    return 0;
  };
  const val1 = parseVal(parts[0]);
  const val2 = parseVal(parts[1]);
  if (operator === '+') return val1 + val2;
  if (operator === '-') return val1 - val2;
  if (operator === '*') return val1 * val2;
  return 0;
}

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(90000);
  
  try {
    console.log(`Navigating to login page: ${WP_ADMIN_URL}...`);
    await page.goto(WP_ADMIN_URL, { waitUntil: 'load' });
    
    console.log('Filling credentials...');
    await page.fill('#user_login', WP_USERNAME);
    await page.fill('#user_pass', WP_PASSWORD);
    
    const captchaLocator = page.locator('.aiowps-captcha-equation');
    if (await captchaLocator.isVisible()) {
      const solution = solveCaptcha(await captchaLocator.innerText());
      console.log(`Solving captcha: ${solution}`);
      await page.fill('.aiowps-captcha-answer', solution.toString());
    }
    
    console.log('Submitting login form...');
    await page.click('#wp-submit');
    await page.waitForSelector('#wpadminbar');
    console.log('Login successful.');
    
    console.log(`Navigating to edit page: ${WP_EDIT_URL}...`);
    await page.goto(WP_EDIT_URL, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    
    const imageFieldSelector = 'input[name="acf[field_66793d9793cee][row-0][field_66793e7a0f36b]"]';
    const hiddenInput = page.locator(imageFieldSelector).first();
    const parentContainer = hiddenInput.locator('xpath=..');
    const addImageBtn = parentContainer.locator('.button, a[data-name="add"], a[data-name="edit"]').first();
    
    console.log('Clicking add image button...');
    await addImageBtn.click();
    await page.waitForTimeout(5000);
    
    console.log('Inspecting active modal...');
    const modalHTML = await page.locator('.media-modal:visible').innerHTML();
    fs.writeFileSync('./scratch/media_modal_dump.html', modalHTML);
    console.log('✓ Saved media modal HTML to ./scratch/media_modal_dump.html');
    
  } catch (err) {
    console.error('Inspector error:', err);
  } finally {
    await browser.close();
  }
}

run();
