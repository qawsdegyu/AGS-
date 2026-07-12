const fs = require('fs');

const idxContent = fs.readFileSync('index.html', 'utf8');

// Get footer section
const startFooterStr = '<!-- ===================== FOOTER ===================== -->';
const endOverlayStr = '<div class="overlay" id="overlay" onclick="closeAll()"></div>';

const startIdx = idxContent.indexOf(startFooterStr);
const endIdx = idxContent.indexOf(endOverlayStr, startIdx) + endOverlayStr.length;
const fullFooterBlock = idxContent.substring(startIdx, endIdx);

function replaceFooter(targetFile) {
    let content = fs.readFileSync(targetFile, 'utf8');
    
    // In profile.html, we currently have just `<div class="toast-container" id="toastContainer"></div>` near the end
    // Let's replace from `</div>\n\n<div class="toast-container" id="toastContainer"></div>` to `<div class="toast-container"...`
    // Actually, in profile.html, we can search for `<div class="toast-container" id="toastContainer"></div>` and replace it with `fullFooterBlock` which INCLUDES the toast container.
    
    if (content.includes('<div class="toast-container" id="toastContainer"></div>')) {
        const newContent = content.replace('<div class="toast-container" id="toastContainer"></div>', fullFooterBlock);
        fs.writeFileSync(targetFile, newContent, 'utf8');
        console.log(`Updated ${targetFile}`);
    } else {
        console.log(`Target not found in ${targetFile}`);
    }
}

replaceFooter('profile.html');
