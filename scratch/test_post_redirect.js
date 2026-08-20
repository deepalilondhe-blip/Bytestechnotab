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
  
  const url = 'https://staging.magnetoitsolutions.com/wp-admin/post.php?post=82504&action=edit';
  console.log(`Navigating directly to post edit URL: ${url}...`);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    const isLoginVisible = await page.locator('#user_login').count() > 0;
    console.log(`Is login form visible? ${isLoginVisible}`);
    await page.screenshot({ path: './test_post_redirect_result.png' });
    console.log('Saved screenshot to test_post_redirect_result.png');
  } catch (err) {
    console.error('Error during navigation:', err.message);
  }
  
  await browser.close();
})();
