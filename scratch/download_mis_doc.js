import { getRawText } from '../parser.js';
import fs from 'fs';

(async () => {
  const url = 'https://docs.google.com/document/d/11R58EMUfm5wY1035ubobLO3B0Z7KaLAR5Yh421cHIrU/edit?tab=t.0';
  console.log('Downloading Google Doc...');
  try {
    const text = await getRawText(url);
    fs.writeFileSync('./content_mis.md', text);
    console.log('Saved to content_mis.md');
    console.log('\n--- FIRST 1000 CHARACTERS ---');
    console.log(text.substring(0, 1000));
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
