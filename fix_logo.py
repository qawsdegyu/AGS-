import os
import glob

html_files = glob.glob('*.html')
target_string = 'style="height: 100px; width: auto; object-fit: contain; transform: scale(1.6); transform-origin: right center;"'
replacement_string = 'style="max-height: 60px; max-width: 250px; width: auto; object-fit: contain;"'

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if target_string in content:
        content = content.replace(target_string, replacement_string)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
