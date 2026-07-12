const fs = require('fs');
const path = require('path');

const dir = process.cwd();
const indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

// Extract footer from index.html
const footerRegex = /(<!-- ===================== FOOTER ===================== -->[\s\S]*?<\/footer>)/;
const match = indexHtml.match(footerRegex);

if (!match) {
  console.error("Could not find footer in index.html");
  process.exit(1);
}

const newFooter = match[1];

// Also define the bad footer to remove in product-details.html
const badFooterRegex = /<!-- Footer -->\s*<footer class="footer" style="margin-top:4rem;">[\s\S]*?<\/footer>/g;

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  let modified = false;

  // Remove bad footer if it exists
  if (badFooterRegex.test(content)) {
    content = content.replace(badFooterRegex, '');
    modified = true;
  }

  // Replace main footer
  if (footerRegex.test(content)) {
    content = content.replace(footerRegex, newFooter);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(path.join(dir, file), content, 'utf8');
    console.log(`Updated footer in ${file}`);
  }
}
console.log("Done");
