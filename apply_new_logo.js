const fs = require('fs');
const path = require('path');

const dir = __dirname;
const oldLogoName = 'شركة_الدقة_للسلامة_العامة_202607091506-removebg-preview.png';
const newLogoName = 'logo.png';

const oldLogoPath = path.join(dir, oldLogoName);
const newLogoPath = path.join(dir, newLogoName);

if (fs.existsSync(oldLogoPath)) {
    // If logo.png already exists, delete it first to allow rename
    if (fs.existsSync(newLogoPath)) {
        fs.unlinkSync(newLogoPath);
    }
    fs.renameSync(oldLogoPath, newLogoPath);
    console.log(`Successfully replaced the main logo with the new transparent one!`);
} else {
    console.log(`Could not find ${oldLogoName}. Maybe it was already renamed?`);
}

// Optional: Append a cache-buster query parameter ?v=5 to logo links in HTML
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
    if (content.includes('logo.png"')) {
        content = content.replace(/logo\.png"/g, 'logo.png?v=5"');
        fs.writeFileSync(filePath, content, 'utf8');
    } else if (content.includes('logo.png?v=3"')) {
        content = content.replace(/logo\.png\?v=3"/g, 'logo.png?v=5"');
        fs.writeFileSync(filePath, content, 'utf8');
    }
});
