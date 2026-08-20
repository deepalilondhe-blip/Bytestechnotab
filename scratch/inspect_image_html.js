import fs from 'fs';

const content = fs.readFileSync('./wp_fields_dump.txt', 'utf8');
const blocks = content.split('-------------------------------------------');

console.log('Searching for banner background image field HTML...');
blocks.forEach((block, idx) => {
  if (block.includes('acf[field_66793d9793cee][row-0][field_66793e7a0f36b]')) {
    // Print this block and the 2 blocks before and after it
    for (let i = Math.max(0, idx - 2); i <= Math.min(blocks.length - 1, idx + 2); i++) {
      console.log(`BLOCK ${i}:`);
      console.log(blocks[i].trim());
      console.log('===================================');
    }
  }
});
