import os
import glob

html_files = glob.glob('*.html')
old_text = '© 2025 AGS Technology. جميع الحقوق محفوظة. | صُمّم باحترافية لخدمة بيئة عمل آمنة'
new_text = '<p>شركة الدقة للسلامة العامة AGS company 2018AGS co.</p>'

for file in html_files:
    if file == 'index.html': # already updated
        continue
    
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_text in content:
        content = content.replace(old_text, new_text)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
