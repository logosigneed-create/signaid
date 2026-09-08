import re
from bs4 import BeautifulSoup
import json

with open('lshop_nx7200_full.html', 'r', encoding='utf-8') as f:
    html = f.read()

print("Page title:")
m = re.search(r'<title>(.*?)</title>', html)
if m:
    print(m.group(1))

# Find all image URLs
imgs = re.findall(r'https?://[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html)
print(f"Total image URLs found: {len(imgs)}")

# Search for 2574824
matches_2574824 = [u for u in imgs if '2574824' in u]
print("Matches for 2574824:")
for u in set(matches_2574824):
    print("  ", u)

# Search for any picture URLs
pic_urls = [u for u in imgs if 'pictures' in u]
print(f"Total picture URLs: {len(pic_urls)}")

# Let's inspect context around 2574824 in html
idx = 0
while True:
    pos = html.find('2574824', idx)
    if pos == -1:
        break
    start = max(0, pos - 300)
    end = min(len(html), pos + 300)
    print("--- CONTEXT AROUND 2574824 ---")
    print(html[start:end])
    print("-------------------------------")
    idx = pos + 7
