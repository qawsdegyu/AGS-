const fs = require('fs');
const path = require('path');

const dir = __dirname;
const newEmail = 'info@agsco.shop';
const oldEmails = ['info@agsco.shop', 'info@agsco.shop'];

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && (filePath.endsWith('.html') || filePath.endsWith('.js'))) {
            callback(filePath, stat);
        } else if (stat.isDirectory() && name !== 'node_modules' && !name.startsWith('.')) {
            walkSync(filePath, callback);
        }
    });
}

walkSync(dir, function(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    oldEmails.forEach(oldEmail => {
        if (content.includes(oldEmail)) {
            content = content.split(oldEmail).join(newEmail);
            changed = true;
        }
    });
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated:', filePath);
    }
});

console.log('All emails updated successfully!');
