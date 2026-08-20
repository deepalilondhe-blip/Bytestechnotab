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
  
  console.log('Navigating to wp-login.php...');
  try {
    await page.goto('https://staging.magnetoitsolutions.com/wp-login.php', { waitUntil: 'load', timeout: 15000 });
    await page.screenshot({ path: './test_wp_login_result.png' });
    console.log('Screenshot saved to test_wp_login_result.png');
  } catch (err) {
    console.error('Navigation error:', err.message);
  }
  
  await browser.close();
})();
