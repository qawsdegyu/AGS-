import os
import glob

html_files = glob.glob('*.html')
old_logo = 'شركة_الدقة_للسلامة_العامة_2K_202607091505 (2)-Photoroomس.png'
new_logo = 'logo.png'

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_logo in content:
        content = content.replace(old_logo, new_logo)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
