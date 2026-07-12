const fs = require('fs');
const path = require('path');

const dir = __dirname;
const svgIconPattern1 = /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="data:image\/svg\+xml[^>]+>/g;
const svgIconPattern2 = /<link\s+rel="icon"\s+type="image\/svg\+xml"\n\s+href="data:image\/svg\+xml[^>]+>/g;
const svgIconPattern3 = /<link\s+rel="icon"\s+type="image\/svg\+xml"[\s\S]*?<\/svg>"\s*\/>/g;

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
    
    if (content.match(svgIconPattern3)) {
        content = content.replace(svgIconPattern3, '');
        changed = true;
    }
    
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Removed old SVG icon from:', filePath);
    }
});
