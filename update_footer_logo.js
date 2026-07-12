const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let count = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('footer-logo')) {
    // We want to replace <img src="logo.png?v=5" ... > with <img src="logof.png" style="...; border-radius: 12px;"> inside the footer-logo div
    // A simpler regex to match the exact img tag in footer
    const updated = content.replace(/<div class="footer-logo">[\s\S]*?<img src="logo\.png[^"]*"([^>]+)>/g, (match, p1) => {
      // p1 is the rest of the attributes (alt, style, etc.)
      let newAttributes = p1;
      // if style is there, we inject border-radius
      if (newAttributes.includes('style="')) {
        newAttributes = newAttributes.replace('style="', 'style="border-radius: 12px; ');
      } else {
        newAttributes += ' style="border-radius: 12px;"';
      }
      return match.replace(/src="logo\.png[^"]*"/, 'src="logof.png"').replace(p1, newAttributes);
    });
    
    if (updated !== content) {
      fs.writeFileSync(f, updated);
      count++;
      console.log('Updated', f);
    }
  }
});
console.log('Total updated:', count);
