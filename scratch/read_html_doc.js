import { getRawText } from '../parser.js';

async function run() {
  const url = 'https://docs.google.com/document/d/1u6SJ0P_VUgp_yL2K7XMuoalbY7bl_OAu9nA4xS5t4Yk/export?format=html';
  console.log('Downloading Google Doc HTML...');
  const html = await getRawText(url);
  
  console.log('Searching for img tags...');
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  let match;
  let count = 0;
  while ((match = imgRegex.exec(html)) !== null) {
    count++;
    const src = match[1];
    const srcPreview = src.startsWith('data:') ? src.substring(0, 80) + '...' : src;
    console.log(`[Image ${count}]: Src = ${srcPreview}`);
    
    // Print text content around the image tag
    const index = match.index;
    const start = Math.max(0, index - 150);
    const end = Math.min(html.length, index + match[0].length + 150);
    // Strip HTML tags from the context preview so we can read the text
    const rawContext = html.substring(start, end)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`Context: ${rawContext.substring(0, 200)}...`);
    console.log('--------------------------------------------------');
  }
  
  if (count === 0) {
    console.log('No img tags found in the HTML export.');
  }
}

run().catch(console.error);
