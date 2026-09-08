import urllib.request
import os
from PIL import Image
import io

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Referer': 'https://shop.l-shop-team.be/fr/Assortiment/T-shirts-fashion/col-rond/Unisex-Heavyweight-T-Shirt.html'
}

os.makedirs('temp_lshop_images', exist_ok=True)

# Also test different path patterns on l-shop-team:
# /out/pictures/generated/product/...
# /out/pictures/master/product/...
# /out/pictures/z1/..., /out/pictures/z2/...

for img_id in range(2574815, 2574835):
    url = f'https://shop.l-shop-team.be/out/pictures/master/product/1/{img_id}.jpg'
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = resp.read()
            im = Image.open(io.BytesIO(data))
            out_file = f'temp_lshop_images/{img_id}.jpg'
            with open(out_file, 'wb') as f:
                f.write(data)
            print(f"{img_id}: {im.size}, {len(data)} bytes -> saved")
    except Exception as e:
        # print(f"{img_id}: {e}")
        pass
