import fs from 'fs';

const content = fs.readFileSync('./wp_fields_dump.txt', 'utf8');
const blocks = content.split('-------------------------------------------');

console.log('Searching for background color/style fields...');
blocks.forEach(block => {
  const lower = block.toLowerCase();
  if (lower.includes('color') || lower.includes('background') || lower.includes('bg') || lower.includes('style') || lower.includes('theme') || lower.includes('dark')) {
    console.log(block.trim());
    console.log('===================================');
  }
});
