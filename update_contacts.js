const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;

const replacements = {
    // 1. Address
    'عمّان، الأردن — المنطقة الصناعية': 'عين الباشا شارع السلط خلف كازية توتال',
    // 2. Phone Numbers
    '+962 79 XXX XXXX': '0786776057 - 0791852909',
    // 3. WhatsApp Link
    'https://wa.me/96279XXXXXXX': 'https://wa.me/962786776057',
    // 4. Telephone Link
    'tel:+96279XXXXXXX': 'tel:+962786776057',
    
    // 5. Facebook
    '<a href="#" class="social-btn" title="Facebook">': '<a href="https://www.facebook.com/AGStecnology?mibextid=ZbWKwL" class="social-btn" title="Facebook" target="_blank">',
    
    // 6. Twitter -> Instagram
    [`<a href="#" class="social-btn" title="Twitter">\n            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>\n          </a>`]: `<a href="https://www.instagram.com/salhout?igsh=eTJpZ203aDEydmdz" class="social-btn" title="Instagram" target="_blank">\n            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>\n          </a>`,
          
    // 7. LinkedIn
    '<a href="#" class="social-btn" title="LinkedIn">': '<a href="https://www.linkedin.com/in/osama-salhoot-0244a616?utm_source=share_via&utm_content=profile&utm_medium=member_android" class="social-btn" title="LinkedIn" target="_blank">',
    
    // 8. YouTube -> Threads
    [`<a href="#" class="social-btn" title="YouTube">\n            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>\n          </a>`]: `<a href="https://www.threads.com/@salhout" class="social-btn" title="Threads" target="_blank" style="font-weight:900; font-family:sans-serif; font-size:16px;">\n            @\n          </a>`
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
