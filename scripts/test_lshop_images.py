import urllib.request
import urllib.error

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Referer': 'https://shop.l-shop-team.be/fr/Assortiment/T-shirts-fashion/col-rond/Unisex-Heavyweight-T-Shirt.html'
}

candidates = [
    'https://shop.l-shop-team.be/out/pictures/master/product/1/2574824.jpg',
    'https://shop.l-shop-team.be/out/pictures/master/product/2/2574824.jpg',
    'https://shop.l-shop-team.be/out/pictures/master/product/3/2574824.jpg',
    'https://shop.l-shop-team.be/out/pictures/master/product/1/2574825.jpg',
    'https://shop.l-shop-team.be/out/pictures/master/product/2/2574825.jpg',
    'https://shop.l-shop-team.be/out/pictures/master/product/1/2574823.jpg',
    'https://shop.l-shop-team.be/out/pictures/master/product/2/2574823.jpg',
    'https://shop.l-shop-team.be/out/pictures/master/product/1/2574826.jpg',
    'https://shop.l-shop-team.be/out/pictures/master/product/2/2574826.jpg',
]

for url in candidates:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            content_type = resp.headers.get('Content-Type')
            content_len = len(resp.read())
            print(f"SUCCESS {resp.status} ({content_type}, {content_len} bytes): {url}")
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {url}")
    except Exception as e:
        print(f"ERR {e}: {url}")
