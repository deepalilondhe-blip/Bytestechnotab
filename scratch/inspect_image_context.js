import { getRawText } from '../parser.js';

async function run() {
  const url = 'https://docs.google.com/document/d/1u6SJ0P_VUgp_yL2K7XMuoalbY7bl_OAu9nA4xS5t4Yk/export?format=html';
  const html = await getRawText(url);
  
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  const match = imgRegex.exec(html);
  if (match) {
    const index = match.index;
    const before = html.substring(Math.max(0, index - 1000), index);
    const after = html.substring(index + match[0].length, Math.min(html.length, index + match[0].length + 1000));
    
    const clean = (str) => str.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    console.log('--- CONTENT BEFORE IMAGE ---');
    console.log(clean(before));
    console.log('--- CONTENT AFTER IMAGE ---');
    console.log(clean(after));
  } else {
    console.log('No image found.');
  }
}

run().catch(console.error);
