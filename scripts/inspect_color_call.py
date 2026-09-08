import re

with open('lshop_nx7200_full.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's search where oxpsvariantsfetch is called in js
for m in re.finditer(r'oxpsvariantsfetch', html):
    start = max(0, m.start() - 200)
    end = min(len(html), m.end() + 500)
    print("--- MATCH oxpsvariantsfetch ---")
    print(html[start:end])
