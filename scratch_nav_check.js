const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const navIdx = content.indexOf('id="navMenu"');
  if (navIdx !== -1) {
    const endIdx = content.indexOf('</ul>', navIdx);
    const navContent = content.substring(navIdx, endIdx);
    const linksCount = (navContent.match(/<li/g) || []).length;
    console.log(`${f}: ${linksCount} links`);
  } else {
    console.log(`${f}: NO NAVMENU`);
  }
});
