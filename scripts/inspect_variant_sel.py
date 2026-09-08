import re

with open('lshop_nx7200_full.html', 'r', encoding='utf-8') as f:
    html = f.read()

for m in re.finditer(r'variant-selection', html):
    start = max(0, m.start() - 200)
    end = min(len(html), m.end() + 800)
    print("--- MATCH variant-selection ---")
    print(html[start:end])
