const fs = require('fs');

const idxContent = fs.readFileSync('index.html', 'utf8');
const startStr = '<nav class="navbar" id="navbar">';
const endStr = '</nav>';

const startIdx = idxContent.indexOf(startStr);
const endIdx = idxContent.indexOf(endStr, startIdx) + endStr.length;
const newNav = idxContent.substring(startIdx, endIdx);

function replaceNavbar(targetFile) {
    let content = fs.readFileSync(targetFile, 'utf8');
    const tStartIdx = content.indexOf(startStr);
    const tEndIdx = content.indexOf(endStr, tStartIdx) + endStr.length;
    
    if (tStartIdx !== -1 && tEndIdx !== -1) {
        let patchedNav = newNav.replace('class="nav-link active"', 'class="nav-link"');
        
        if (targetFile === 'products.html') {
            patchedNav = patchedNav.replace('href="products.html" class="nav-link"', 'href="products.html" class="nav-link active"');
        } else if (targetFile === 'services.html') {
            patchedNav = patchedNav.replace('href="services.html" class="nav-link"', 'href="services.html" class="nav-link active"');
        } else if (targetFile === 'rfq.html') {
            patchedNav = patchedNav.replace('href="rfq.html" class="nav-link"', 'href="rfq.html" class="nav-link active"');
        }
        
        // Fix hash links so they refer to the homepage sections
        patchedNav = patchedNav.replace(/href="#about"/g, 'href="index.html#about"');
        patchedNav = patchedNav.replace(/href="#contact"/g, 'href="index.html#contact"');
        
        const newContent = content.substring(0, tStartIdx) + patchedNav + content.substring(tEndIdx);
        fs.writeFileSync(targetFile, newContent, 'utf8');
        console.log(`Updated ${targetFile}`);
    } else {
        console.log(`Navbar not found in ${targetFile}`);
    }
}

const filesToUpdate = [
    'products.html', 'services.html', 'rfq.html', 'checkout.html',
    'login.html', 'register.html', 'forgot-password.html', 
    'reset-password.html', 'profile.html', 'product-details.html'
];

filesToUpdate.forEach(file => {
    if (fs.existsSync(file)) {
        replaceNavbar(file);
    }
});
