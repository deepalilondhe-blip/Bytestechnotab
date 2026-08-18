import { chromium } from 'playwright';
import fs from 'fs';

async function run() {
  console.log('Launching browser to check custom login page HTML...');
  const browser = await chromium.launch({ headless: true });
  // Let's test without HTTP credentials first
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Navigating to custom login page...');
    await page.goto('https://staging.bytestechnolab.com/HjiMvLE1D6ycKpE/', { waitUntil: 'networkidle' });
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: './login_page_inspect.png' });
    
    // Check if #loginform is visible
    const isLoginFormVisible = await page.locator('#loginform').isVisible();
    console.log('Is WordPress login form visible:', isLoginFormVisible);
    
    if (isLoginFormVisible) {
      console.log('Dumping form HTML...');
      const formHtml = await page.locator('#loginform').innerHTML();
      fs.writeFileSync('./loginform_html.txt', formHtml);
      
      const textContent = await page.locator('#loginform').innerText();
      fs.writeFileSync('./loginform_text.txt', textContent);
      console.log('Form details dumped successfully.');
    } else {
      console.log('Form not visible. Current page title:', await page.title());
      console.log('Page URL:', page.url());
      console.log('Page body text:', await page.innerText('body'));
    }
    
  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await browser.close();
  }
}

run();
