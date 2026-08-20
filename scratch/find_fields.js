import fs from 'fs';

const content = fs.readFileSync('./wp_fields_dump.txt', 'utf8');
const blocks = content.split('-------------------------------------------');

console.log('Searching for row-0 fields...');
blocks.forEach(block => {
  if (block.includes('row-0') && (block.includes('Description') || block.includes('Heading') || block.includes('Title'))) {
    console.log(block.trim());
    console.log('===================================');
  }
});
