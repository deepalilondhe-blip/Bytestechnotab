import fs from 'fs';

const content = fs.readFileSync('./wp_fields_dump.txt', 'utf8');
const blocks = content.split('-------------------------------------------');

console.log('Searching for image fields around Success Stories...');
blocks.forEach(block => {
  if (block.includes('Image') || block.includes('image') || block.includes('img')) {
    if (block.includes('row-4') || block.includes('row-5') || block.includes('row-7') || block.includes('row-8')) {
      console.log(block.trim());
      console.log('===================================');
    }
  }
});
