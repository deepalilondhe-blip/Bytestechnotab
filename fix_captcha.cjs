const fs = require('fs');
let content = fs.readFileSync('cross_verify.js', 'utf8');
const newFunc = `function solveCaptcha(equationText) {
  const clean = equationText.replace(/=/g, '').replace(/−/g, '-').replace(/-/g, '-').replace(/×/g, '*').replace(/\\bx\\b/g, '*').replace(/÷/g, '/').trim().toLowerCase();
  let operator = '', parts = [];
  if (clean.includes('+') || clean.includes('plus')) {
    operator = '+'; parts = clean.split(/\\+|\\bplus\\b/);
  } else if (clean.includes('-') || clean.includes('minus')) {
    operator = '-'; parts = clean.split(/-|\\bminus\\b/);
  } else if (clean.includes('*') || clean.includes('times')) {
    operator = '*'; parts = clean.split(/\\*|\\btimes\\b/);
  } else {
    throw new Error('Unknown operator in captcha: ' + clean);
  }
  const aStr = parts[0].trim();
  const bStr = parts[1].trim();
  const a = wordsToNumbers[aStr] !== undefined ? wordsToNumbers[aStr] : parseInt(aStr, 10);
  const b = wordsToNumbers[bStr] !== undefined ? wordsToNumbers[bStr] : parseInt(bStr, 10);
  if (isNaN(a) || isNaN(b)) throw new Error('Could not parse numbers from captcha: ' + clean);
  if (operator === '+') return a + b;
  if (operator === '-') return a - b;
  if (operator === '*') return a * b;
  return 0;
}`;
content = content.replace(/function solveCaptcha\(equationText\) \{[\s\S]*?return 0;\r?\n\}/, newFunc);
fs.writeFileSync('cross_verify.js', content);
console.log("Replaced!");
