import os

files = [
    'index.html', 'products.html', 'product-details.html', 'checkout.html', 
    'rfq.html', 'faq.html', 'about.html', 'contact.html', 'dashboard.html', 
    'login.html', 'register.html', 'forgot-password.html', 'reset-password.html', 'profile.html', 'services.html'
]

for filename in files:
    if not os.path.exists(filename):
        continue
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace old domain with new domain
    content = content.replace('https://www.ags-safety.com', 'https://www.agsco.shop')
    
    # Add favicon if not present
    if '<link rel="icon" type="image/png" href="logo.png"' not in content and '<link rel="icon" href="logo.png"' not in content:
        # replace the old crazy favicon
        if '<link rel="icon" type="image/svg+xml"' in content:
            import re
            content = re.sub(r'<link rel="icon" type="image/svg\+xml"[^>]+>', '<link rel="icon" type="image/png" href="logo.png" />', content)
        else:
            # just inject it before </head>
            content = content.replace('</head>', '  <link rel="icon" type="image/png" href="logo.png" />\n</head>')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done fixing meta tags and favicons in all files!")
