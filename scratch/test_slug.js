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
  
  const testUrls = [
    'https://staging.magnetoitsolutions.com/HjiMvLE1D6ycKpE/',
    'https://staging.magnetoitsolutions.com/login/',
    'https://staging.magnetoitsolutions.com/admin/',
    'https://staging.magnetoitsolutions.com/backend/'
  ];
  
  for (const url of testUrls) {
    console.log(`Navigating to: ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 10000 });
      const isLoginVisible = await page.locator('#user_login').count() > 0;
      console.log(`Url: ${url} | Login form found: ${isLoginVisible}`);
      if (isLoginVisible) {
        await page.screenshot({ path: './test_slug_success.png' });
        console.log('Saved success screenshot to test_slug_success.png');
        break;
      }
    } catch (err) {
      console.log(`Error on ${url}: ${err.message}`);
    }
  }
  
  await browser.close();
})();
