import urllib.request
import urllib.parse
import http.cookiejar
import json

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://shop.l-shop-team.be/fr/Assortiment/T-shirts-fashion/col-rond/Unisex-Heavyweight-T-Shirt.html'
}

# 1. First get the token from the validation page
url = 'https://shop.l-shop-team.be/fr/Assortiment/T-shirts-fashion/col-rond/Unisex-Heavyweight-T-Shirt.html'
req = urllib.request.Request(url, headers=headers)
with opener.open(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

import re
token_match = re.search(r'const token = "([^"]+)";', html)
if not token_match:
    print("No token found")
    exit()

token = token_match.group(1)
print(f"Got token: {token[:30]}...")

# 2. POST to /validation_token.php
post_data = urllib.parse.urlencode({'u': token}).encode('utf-8')
post_headers = headers.copy()
post_headers['Content-Type'] = 'application/x-www-form-urlencoded'

post_req = urllib.request.Request('https://shop.l-shop-team.be/validation_token.php', data=post_data, headers=post_headers)
with opener.open(post_req) as resp:
    res_data = resp.read().decode('utf-8', errors='ignore')
    print("Validation resp:", res_data)
    res_json = json.loads(res_data)
    redirect_url = res_json.get('redirect')

print("Redirecting to:", redirect_url)
if redirect_url:
    get_req = urllib.request.Request(urllib.parse.urljoin('https://shop.l-shop-team.be', redirect_url), headers=headers)
    with opener.open(get_req) as resp:
        final_html = resp.read().decode('utf-8', errors='ignore')
        print(f"Final page length: {len(final_html)}")
        with open('lshop_nx7200_full.html', 'w', encoding='utf-8') as f:
            f.write(final_html)
