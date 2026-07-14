const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;

const replacements = {
    // Phone numbers without links
    '<div class="footer-contact-value">0786776057 - 0791852909</div>': '<div class="footer-contact-value" dir="ltr"><a href="tel:0786776057" style="color:inherit; text-decoration:none;">0786776057</a> - <a href="tel:0791852909" style="color:inherit; text-decoration:none;">0791852909</a></div>',
    
    // Email without links
    '<div class="footer-contact-value">info@agsco.shop</div>': '<div class="footer-contact-value"><a href="mailto:info@agsco.shop" style="color:inherit; text-decoration:none;">info@agsco.shop</a></div>'
};

let count = 0;

fs.readdir(directoryPath, (err, files) => {
    if (err) return console.error('Unable to scan directory:', err);

    const htmlFiles = files.filter(file => file.endsWith('.html'));

    htmlFiles.forEach(file => {
        const filePath = path.join(directoryPath, file);
        
        fs.readFile(filePath, 'utf8', (err, content) => {
            if (err) return console.error('Error reading file:', err);

            let newContent = content;
            
            for (const [key, value] of Object.entries(replacements)) {
                newContent = newContent.split(key).join(value);
            }

            if (newContent !== content) {
                fs.writeFile(filePath, newContent, 'utf8', (err) => {
                    if (err) return console.error('Error writing file:', err);
                    count++;
                    console.log(`Updated ${file}`);
                });
            }
        });
    });
});

setTimeout(() => {
    console.log(`\n✅ Successfully updated ${count} HTML files!`);
}, 1000);
