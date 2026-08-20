const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
chromium.use(stealth());
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    httpCredentials: { username: 'N*GfiyaBCO1RS2@m', password: 'bu5CwVi&Y!Qy2EE4' }
  });
  await page.goto('https://staging.bytestechnolab.com/HjiMvLE1D6ycKpE/');
  await page.fill('#user_login', 'deepalilondhe');
  await page.fill('#user_pass', 'NCFDB^a!xy^jk)qRcYMx7%WS');
  const text = await page.locator('.math-captcha label').first().textContent();
  const clean = text.replace(/=/g, '').replace(/−/g, '-').replace(/-/g, '-').replace(/×/g, '*').trim().toLowerCase();
  
  const wordsToNumbers = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
  let operator = '', parts = [];
  if (clean.includes('+')) { operator = '+'; parts = clean.split('+'); }
  else if (clean.includes('-')) { operator = '-'; parts = clean.split('-'); }
  
  const aStr = parts[0].trim();
  const bStr = parts[1].trim();
  const a = wordsToNumbers[aStr] !== undefined ? wordsToNumbers[aStr] : parseInt(aStr, 10);
  const b = wordsToNumbers[bStr] !== undefined ? wordsToNumbers[bStr] : parseInt(bStr, 10);
  const answer = operator === '+' ? a + b : a - b;
  
  await page.fill('input.aiowps-captcha-answer, input[name*="captcha"]', String(answer));
  await page.click('#wp-submit');
  await page.waitForNavigation();
  console.log('Landed on:', page.url());
  await page.screenshot({ path: 'after_login.png' });
  await browser.close();
})();
