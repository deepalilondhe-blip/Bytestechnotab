import fs from 'fs';

const content = fs.readFileSync('./wp_fields_dump.txt', 'utf8');
const blocks = content.split('-------------------------------------------');

console.log('Searching for row-11 fields...');
blocks.forEach(block => {
  if (block.includes('row-11') || block.includes('field_667d464d337c1')) {
    console.log(block.trim());
    console.log('===================================');
  }
});
