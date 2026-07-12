import os

for f in os.listdir('.'):
    if f.endswith('.html'):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            navIdx = content.find('id="navMenu"')
            if navIdx != -1:
                endIdx = content.find('</ul>', navIdx)
                navContent = content[navIdx:endIdx]
                linksCount = navContent.count('<li')
                print(f"{f}: {linksCount} links")
            else:
                print(f"{f}: NO NAVMENU")
