import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    idx_content = f.read()

start_str = '<nav class="navbar" id="navbar">'
end_str = '</nav>'

start_idx = idx_content.find(start_str)
end_idx = idx_content.find(end_str, start_idx) + len(end_str)
new_nav = idx_content[start_idx:end_idx]

def replace_navbar(target_file):
    with open(target_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    t_start_idx = content.find(start_str)
    t_end_idx = content.find(end_str, t_start_idx) + len(end_str)
    
    if t_start_idx != -1 and t_end_idx != -1:
        patched_nav = new_nav.replace('class="nav-link active"', 'class="nav-link"')
        
        if target_file == 'products.html':
            patched_nav = patched_nav.replace('href="products.html" class="nav-link"', 'href="products.html" class="nav-link active"')
        elif target_file == 'services.html':
            patched_nav = patched_nav.replace('href="services.html" class="nav-link"', 'href="services.html" class="nav-link active"')
        elif target_file == 'rfq.html':
            patched_nav = patched_nav.replace('href="rfq.html" class="nav-link"', 'href="rfq.html" class="nav-link active"')
        elif target_file == 'about.html':
            patched_nav = patched_nav.replace('href="about.html" class="nav-link"', 'href="about.html" class="nav-link active"')
        elif target_file == 'contact.html':
            patched_nav = patched_nav.replace('href="contact.html" class="nav-link"', 'href="contact.html" class="nav-link active"')
            
        patched_nav = patched_nav.replace('href="#about"', 'href="index.html#about"')
        patched_nav = patched_nav.replace('href="#contact"', 'href="index.html#contact"')
        
        new_content = content[:t_start_idx] + patched_nav + content[t_end_idx:]
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {target_file}')
    else:
        print(f'Navbar not found in {target_file}')

files = ['products.html', 'services.html', 'rfq.html', 'about.html', 'contact.html', 'faq.html', 'product-details.html', 'profile.html']

for f in files:
    if os.path.exists(f):
        replace_navbar(f)
