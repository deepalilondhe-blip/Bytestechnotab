import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext({
    httpCredentials: {
      username: "magnetoback",
      password: "R{]1XR]p6c5zl9MZ}l9j3"
    }
  });
  const page = await context.newPage();
  
  const url = 'https://staging.magnetoitsolutions.com/wp-login.php?loggedout=true';
  console.log(`Navigating to: ${url}...`);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    const isLoginVisible = await page.locator('#user_login').count() > 0;
    console.log(`Login form visible on loggedout URL: ${isLoginVisible}`);
    await page.screenshot({ path: './test_loggedout_bypass_result.png' });
    console.log('Saved screenshot to test_loggedout_bypass_result.png');
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await browser.close();
})();
