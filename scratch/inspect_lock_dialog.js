import { chromium } from 'playwright';
import dotenv from 'dotenv';

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
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto(WP_ADMIN_URL);
    await page.fill('#user_login', WP_USERNAME);
    await page.fill('#user_pass', WP_PASSWORD);
    
    const captchaLocator = page.locator('.aiowps-captcha-equation');
    if (await captchaLocator.isVisible()) {
      const solution = solveCaptcha(await captchaLocator.innerText());
      await page.fill('.aiowps-captcha-answer', solution.toString());
    }
    await page.click('#wp-submit');
    await page.waitForSelector('#wpadminbar');
    
    await page.goto(WP_EDIT_URL);
    await page.waitForTimeout(5000); // Wait for page and overlays to load
    
    const lockDialogExists = await page.locator('#post-lock-dialog').count();
    console.log(`Lock dialog exists: ${lockDialogExists}`);
    if (lockDialogExists > 0) {
      const innerHTML = await page.locator('#post-lock-dialog').innerHTML();
      console.log('Lock dialog Inner HTML:');
      console.log(innerHTML);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

run();
