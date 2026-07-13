const fs = require('fs');
const glob = require('glob');

const files = [
  'services.html', 'rfq.html', 'reset-password.html', 'profile.html',
  'products.html', 'product-details.html', 'forgot-password.html',
  'faq.html', 'contact.html', 'about.html'
];

const targetStr = 'style="height: 100px; width: auto; object-fit: contain; transform: scale(1.1); transform-origin: right center; border-radius: 12px;"';
const targetStrIndex = 'style="height: 140px; width: auto; object-fit: contain; transform: scale(1.2); transform-origin: right center; border-radius: 12px; pointer-events: none;"';

const replacementStr = 'style="max-height: 120px; max-width: 300px; width: auto; object-fit: contain; border-radius: 12px;"';
const replacementStrIndex = 'style="max-height: 140px; max-width: 350px; width: auto; object-fit: contain; border-radius: 12px; pointer-events: none;"';

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(targetStr)) {
      content = content.replace(targetStr, replacementStr);
      fs.writeFileSync(file, content);
      console.log('Updated ' + file);
    }
  } catch (e) {
    console.error(e);
  }
}

try {
  let indexContent = fs.readFileSync('index.html', 'utf8');
  if (indexContent.includes(targetStrIndex)) {
    indexContent = indexContent.replace(targetStrIndex, replacementStrIndex);
    fs.writeFileSync('index.html', indexContent);
    console.log('Updated index.html');
  }
} catch(e) {}
