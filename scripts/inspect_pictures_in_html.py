import re

with open('lshop_nx7200_full.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's search for any picture tags, img src, or data attributes
imgs = re.findall(r'(?:src|href|data-[a-z0-9_-]+)="([^"]*pictures[^"]*)"', html, re.IGNORECASE)
print(f"Pictures attributes: {len(imgs)}")
for u in set(imgs):
    print("  ", u)

# Also look for any JSON blobs or script tags containing product data
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
for s in scripts:
    if 'pictures' in s or 'media' in s or 'images' in s or 'NX7200' in s:
        print("Script with media/images (len %d):" % len(s))
        for line in s.splitlines():
            if any(k in line.lower() for k in ['jpg', 'png', 'image', 'picture', 'color', 'blanc', 'white']):
                print("    ", line[:150])
