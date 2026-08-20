import { getRawText } from '../parser.js';

async function run() {
  const url = 'https://docs.google.com/document/d/1u6SJ0P_VUgp_yL2K7XMuoalbY7bl_OAu9nA4xS5t4Yk/export?format=txt';
  console.log('Downloading Google Doc text...');
  const text = await getRawText(url);
  
  const lines = text.split('\n');
  console.log('Searching for image references...');
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('image') || line.toLowerCase().includes('graphic') || line.toLowerCase().includes('banner') || line.toLowerCase().includes('bg') || line.toLowerCase().includes('png') || line.toLowerCase().includes('jpg')) {
      console.log(`[Line ${idx + 1}]: ${line.trim()}`);
    }
  });
}

run().catch(console.error);
