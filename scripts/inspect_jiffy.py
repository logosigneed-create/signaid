import urllib.request
import re
import json

url = 'https://www.jiffyshirts.com/nextlevel-7200.html'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
if m:
    data = json.loads(m.group(1))
    with open('jiffy_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print('Saved jiffy_data.json!')
else:
    print('Not found')

