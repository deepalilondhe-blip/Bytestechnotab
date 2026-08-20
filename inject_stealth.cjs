const fs = require('fs');
let content = fs.readFileSync('cross_verify.js', 'utf8');

// Replace import
content = content.replace("import { chromium } from 'playwright';", 
  "import { chromium } from 'playwright-extra';\nimport stealth from 'puppeteer-extra-plugin-stealth';\nchromium.use(stealth());");

fs.writeFileSync('cross_verify.js', content);
console.log("Stealth injected into cross_verify.js");

let content2 = fs.readFileSync('check_env.js', 'utf8');
content2 = content2.replace("import { chromium } from 'playwright';", 
  "import { chromium } from 'playwright-extra';\nimport stealth from 'puppeteer-extra-plugin-stealth';\nchromium.use(stealth());");
fs.writeFileSync('check_env.js', content2);
console.log("Stealth injected into check_env.js");
