// Quick script to dump all ACF input/textarea selectors on the WP editor page
import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const WP_ADMIN_URL = process.env.WP_ADMIN_URL;
const WP_USERNAME  = process.env.WP_USERNAME;
const WP_PASSWORD  = process.env.WP_PASSWORD;
const WP_EDIT_URL  = process.env.WP_EDIT_URL;
const HTTP_BASIC_AUTH_USER = process.env.HTTP_BASIC_AUTH_USER || '';
const HTTP_BASIC_AUTH_PASS = process.env.HTTP_BASIC_AUTH_PASS || '';

const wordsToNumbers = { zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90 };
function solveCaptcha(eq) {
  const c = eq.replace(/=/g,'').replace(/−|-/g,'-').replace(/×|\bx\b/g,'*').trim().toLowerCase();
  let op='',parts=[];
  if(c.includes('+')||c.includes('plus')){op='+';parts=c.split(/\+|\bplus\b/);}
  else if(c.includes('-')||c.includes('minus')){op='-';parts=c.split(/-|\bminus\b/);}
  else if(c.includes('*')||c.includes('times')){op='*';parts=c.split(/\*|\btimes\b/);}
  const pv=s=>{const t=s.trim();return /^\d+$/.test(t)?parseInt(t):wordsToNumbers[t]??0};
  const v1=pv(parts[0]),v2=pv(parts[1]);
  return op==='+'?v1+v2:op==='-'?v1-v2:v1*v2;
}

const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const ctx = await browser.newContext({
  viewport:{width:1400,height:900},
  httpCredentials: HTTP_BASIC_AUTH_USER ? { username: HTTP_BASIC_AUTH_USER, password: HTTP_BASIC_AUTH_PASS } : undefined
});
const page = await ctx.newPage();

await page.goto(WP_ADMIN_URL, { waitUntil: 'load' });
const login = await page.locator('#user_login').isVisible().catch(()=>false);
if (login) {
  await page.fill('#user_login', WP_USERNAME);
  await page.fill('#user_pass', WP_PASSWORD);
  const cap = page.locator('.aiowps-captcha-equation');
  if (await cap.isVisible()) {
    const eq = await cap.innerText();
    await page.fill('.aiowps-captcha-answer', solveCaptcha(eq).toString());
  }
  await page.click('#wp-submit');
  await page.waitForSelector('#wpadminbar', { timeout: 30000 });
}

await page.goto(WP_EDIT_URL, { waitUntil: 'load' });
await page.waitForTimeout(3000);

// Dump all visible labels and their paired input/textarea IDs
const fields = await page.evaluate(() => {
  const results = [];
  const labels = document.querySelectorAll('.acf-label label, .acf-field > .acf-label > label');
  labels.forEach(label => {
    const field = label.closest('.acf-field');
    if (!field) return;
    const input = field.querySelector('input[type="text"], textarea');
    if (input) {
      results.push({
        label: label.innerText.trim(),
        id: input.id || '',
        name: input.name || '',
        tag: input.tagName
      });
    }
  });
  return results;
});

console.log('\n=== ALL ACF FIELDS ON WP EDITOR PAGE ===\n');
fields.forEach(f => {
  console.log(`Label : "${f.label}"`);
  console.log(`  ID  : ${f.id}`);
  console.log(`  Name: ${f.name}`);
  console.log('');
});
console.log(`Total fields found: ${fields.length}`);

await browser.close();
