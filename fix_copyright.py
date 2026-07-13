import glob
import os

html_files = glob.glob('*.html')
target = '<p>شركة الدقة للسلامة العامة AGS company 2018AGS co.</p>'
replacement = '<p>شركة الدقة للسلامة العامة AGS company 2018</p>'

for file_name in html_files:
    with open(file_name, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if target in content:
        content = content.replace(target, replacement)
        with open(file_name, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_name}")
