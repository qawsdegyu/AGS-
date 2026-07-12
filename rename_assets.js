const fs = require('fs');
const path = require('path');

const dir = __dirname;

// 1. Rename the files safely
const newFaviconName = 'favicon.png';
const newLogoName = 'logo.png';
const oldFaviconName = 'Artboard 2 copy 4.png';
const oldLogoName = 'WhatsApp Image 2026-07-11 at 10.13.42 AM.png';

if (fs.existsSync(path.join(dir, oldFaviconName))) {
    // if a favicon.png already exists, remove it first
    if (fs.existsSync(path.join(dir, newFaviconName))) {
        fs.unlinkSync(path.join(dir, newFaviconName));
    }
    fs.renameSync(path.join(dir, oldFaviconName), path.join(dir, newFaviconName));
    console.log(`Renamed "${oldFaviconName}" to "${newFaviconName}"`);
}

if (fs.existsSync(path.join(dir, oldLogoName))) {
    // if a logo.png already exists, remove it first
    if (fs.existsSync(path.join(dir, newLogoName))) {
        fs.unlinkSync(path.join(dir, newLogoName));
    }
    fs.renameSync(path.join(dir, oldLogoName), path.join(dir, newLogoName));
    console.log(`Renamed "${oldLogoName}" to "${newLogoName}"`);
}

// 2. Update all HTML files to use favicon.png
function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && filePath.endsWith('.html')) {
            callback(filePath, stat);
        } else if (stat.isDirectory() && name !== 'node_modules' && !name.startsWith('.')) {
            walkSync(filePath, callback);
        }
    });
}

walkSync(dir, function(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Replace old favicon link with new one
    if (content.includes('href="logo.png?v=3"')) {
        content = content.replace(/href="logo\.png\?v=3"/g, 'href="favicon.png?v=4"');
        changed = true;
    }
    if (content.includes('href="logo.png"')) {
        // Only replace it in the context of rel="icon"
        content = content.replace(/<link[^>]+rel="icon"[^>]+href="logo\.png"[^>]*>/g, '<link rel="icon" type="image/png" href="favicon.png?v=4" />');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated Favicon in:', filePath);
    }
});

console.log('All done successfully!');
