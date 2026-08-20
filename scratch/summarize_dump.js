import fs from 'fs';

const content = fs.readFileSync('./wp_fields_dump.txt', 'utf8');
const blocks = content.split('-------------------------------------------');

const fieldSummary = [];
blocks.forEach(block => {
  const lines = block.trim().split('\n');
  const details = {};
  lines.forEach(line => {
    if (line.startsWith('Type:')) details.type = line.split(': ')[1];
    if (line.startsWith('Label:')) details.label = line.split(': ')[1];
    if (line.startsWith('Tag:')) details.tag = line.split(': ')[1];
    if (line.startsWith('Name Attribute:')) details.name = line.split(': ')[1];
    if (line.startsWith('ID Attribute:')) details.id = line.split(': ')[1];
    if (line.startsWith('Suggested config selector:')) details.selector = line.split(': ')[1];
  });
  if (details.label) {
    fieldSummary.push(details);
  }
});

console.log(`Total fields found: ${fieldSummary.length}`);
console.log('--- UNIQUE FIELD LABELS & FIELDS ---');
const uniqueFields = [];
fieldSummary.forEach(f => {
  if (f.type === 'ACF Field' && f.name && !f.name.includes('acfcloneindex') && !f.name.includes('acf-field_')) {
    // If it's a real field name with row index, let's keep it
    uniqueFields.push(f);
  } else if (f.type === 'ACF Field' && f.id && f.id !== 'N/A' && !f.id.includes('acfcloneindex')) {
    uniqueFields.push(f);
  }
});

console.log(uniqueFields.slice(0, 50).map(f => `${f.label} (${f.tag}) -> ID: ${f.id} | Selector: ${f.selector}`).join('\n'));
fs.writeFileSync('./wp_fields_summary.txt', uniqueFields.map(f => `${f.label} (${f.tag}) -> ID: ${f.id} | Selector: ${f.selector}`).join('\n'));
