import fs from 'fs';

const content = fs.readFileSync('./wp_fields_dump.txt', 'utf8');
const blocks = content.split('-------------------------------------------');

console.log('Searching for row-0 fields...');
blocks.forEach(block => {
  if (block.includes('acf[field_6a169f2632377][row-0]') || block.includes('acf-field_6a169f2632377-row-0')) {
    console.log(block.trim());
    console.log('===================================');
  }
});
