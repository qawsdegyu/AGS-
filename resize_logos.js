const fs = require('fs');
const glob = require('glob');

const files = [
  'services.html', 'rfq.html', 'reset-password.html', 'profile.html',
  'products.html', 'product-details.html', 'forgot-password.html',
  'faq.html', 'contact.html', 'about.html', 'index.html',
  'login.html', 'register.html', 'checkout.html'
];

// Target strings
const oldNavbarStr = 'style="max-height: 60px; max-width: 250px; width: auto; object-fit: contain;"';
const oldFooterStr = 'style="max-height: 120px; max-width: 300px; width: auto; object-fit: contain; border-radius: 12px;"';
const oldIndexFooterStr = 'style="max-height: 140px; max-width: 350px; width: auto; object-fit: contain; border-radius: 12px; pointer-events: none;"';
const oldLoginRegStr = 'style="max-height: 100px; max-width: 300px; width: auto; object-fit: contain; margin: 0 auto; display: block;"';
const oldCheckoutStr = 'style="max-height: 70px; max-width: 250px; width: auto; object-fit: contain;"';

// New replacement strings
const newNavbarStr = 'style="max-height: 45px; max-width: 160px; width: auto; object-fit: contain;"';
const newFooterStr = 'style="max-height: 80px; max-width: 220px; width: auto; object-fit: contain; border-radius: 12px;"';
const newIndexFooterStr = 'style="max-height: 90px; max-width: 240px; width: auto; object-fit: contain; border-radius: 12px; pointer-events: none;"';
const newLoginRegStr = 'style="max-height: 70px; max-width: 220px; width: auto; object-fit: contain; margin: 0 auto; display: block;"';
const newCheckoutStr = 'style="max-height: 50px; max-width: 180px; width: auto; object-fit: contain;"';

for (const file of files) {
  try {
    if (!fs.existsSync(file)) continue;
    
    let content = fs.readFileSync(file, 'utf8');
    let updated = false;

    if (content.includes(oldNavbarStr)) {
      content = content.replace(new RegExp(escapeRegExp(oldNavbarStr), 'g'), newNavbarStr);
      updated = true;
    }
    
    if (content.includes(oldFooterStr)) {
      content = content.replace(new RegExp(escapeRegExp(oldFooterStr), 'g'), newFooterStr);
      updated = true;
    }
    
    if (content.includes(oldIndexFooterStr)) {
      content = content.replace(new RegExp(escapeRegExp(oldIndexFooterStr), 'g'), newIndexFooterStr);
      updated = true;
    }

    if (content.includes(oldLoginRegStr)) {
      content = content.replace(new RegExp(escapeRegExp(oldLoginRegStr), 'g'), newLoginRegStr);
      updated = true;
    }

    if (content.includes(oldCheckoutStr)) {
      content = content.replace(new RegExp(escapeRegExp(oldCheckoutStr), 'g'), newCheckoutStr);
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated ' + file);
    }
  } catch (e) {
    console.error('Error with file', file, e);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
