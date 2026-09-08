import urllib.request
import urllib.parse
import http.cookiejar
import json

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://shop.l-shop-team.be/fr/Assortiment/T-shirts-fashion/col-rond/Unisex-Heavyweight-T-Shirt.html'
}

# Bypass
url = 'https://shop.l-shop-team.be/fr/Assortiment/T-shirts-fashion/col-rond/Unisex-Heavyweight-T-Shirt.html'
req = urllib.request.Request(url, headers=headers)
with opener.open(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

import re
token_match = re.search(r'const token = "([^"]+)";', html)
if token_match:
    token = token_match.group(1)
    post_data = urllib.parse.urlencode({'u': token}).encode('utf-8')
    post_headers = headers.copy()
    post_headers['Content-Type'] = 'application/x-www-form-urlencoded'
    post_req = urllib.request.Request('https://shop.l-shop-team.be/validation_token.php', data=post_data, headers=post_headers)
    opener.open(post_req)

var_url = 'https://shop.l-shop-team.be/index.php?lang=8&cl=oxpsvariantsfetch&parentid=2484756&color=White'
req2 = urllib.request.Request(var_url, headers=headers)
with opener.open(req2) as resp:
    data = resp.read().decode('utf-8', errors='ignore')
    res = json.loads(data)
    with open('lshop_white_full.json', 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=2)
    print("Saved lshop_white_full.json")
