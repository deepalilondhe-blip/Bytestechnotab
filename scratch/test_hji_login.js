import { chromium } from 'playwright';

function solveCaptcha(equation) {
  const clean = equation.replace('=', '').trim();
  const parts = clean.split(/\s+/);
  const num1 = parseInt(parts[0], 10);
  const operator = parts[1];
  const num2 = parseInt(parts[2], 10);
  if (operator === '+') return num1 + num2;
  if (operator === '-') return num1 - num2;
  if (operator === '*') return num1 * num2;
  return 0;
}

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext({
    httpCredentials: {
      username: "magnetoback",
      password: "R{]1XR]p6c5zl9MZ}l9j3"
    }
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to custom slug HjiMvLE1D6ycKpE...');
    await page.goto('https://staging.magnetoitsolutions.com/HjiMvLE1D6ycKpE/', { waitUntil: 'load', timeout: 30000 });
    await page.screenshot({ path: './test_hji_page.png' });
    
    const isLoginVisible = await page.locator('#user_login').count() > 0;
    console.log('Is login form visible?', isLoginVisible);
    
    if (isLoginVisible) {
      console.log('Filling credentials...');
      await page.fill('#user_login', 'deepalilondhe');
      await page.fill('#user_pass', 'NCFDB^a!xy^jk)qRcYMx7%WS');
      
      const captchaLocator = page.locator('.aiowps-captcha-equation');
      if (await captchaLocator.isVisible()) {
        const equation = await captchaLocator.innerText();
        const solution = solveCaptcha(equation);
        await page.fill('.aiowps-captcha-answer', solution.toString());
      }
      
      await page.click('#wp-submit');
      console.log('Waiting for admin bar or error...');
      await Promise.race([
        page.waitForSelector('#wpadminbar', { timeout: 30000 }).then(() => console.log('✓ Logged in!')),
        page.waitForSelector('#login_error', { timeout: 30000 }).then(() => console.log('❌ Login Error!'))
      ]);
      await page.screenshot({ path: './test_hji_after_login.png' });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await browser.close();
})();
