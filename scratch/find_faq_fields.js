import fs from 'fs';

if (!fs.existsSync('./wp_fields_dump.txt')) {
  console.log('No wp_fields_dump.txt found.');
  process.exit(0);
}

const content = fs.readFileSync('./wp_fields_dump.txt', 'utf8');
const blocks = content.split('-------------------------------------------');

console.log('Searching for FAQ or Footer related fields...');
blocks.forEach(block => {
  if (block.toLowerCase().includes('faq') || block.toLowerCase().includes('footer') || block.toLowerCase().includes('column')) {
    console.log(block.trim());
    console.log('===================================');
  }
});
