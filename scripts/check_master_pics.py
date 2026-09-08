import urllib.request
from PIL import Image
import io

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Referer': 'https://shop.l-shop-team.be/fr/Assortiment/T-shirts-fashion/col-rond/Unisex-Heavyweight-T-Shirt.html'
}

urls = [
    'https://shop.l-shop-team.be/out/pictures/master/product/1/2557951.jpg',
    'https://shop.l-shop-team.be/out/pictures/master/product/2/2517345.jpg',
]

for url in urls:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
        im = Image.open(io.BytesIO(data))
        fname = url.split('/')[-1]
        pnum = url.split('/')[-2]
        outname = f"temp_lshop_images/p{pnum}_{fname}"
        with open(outname, 'wb') as f:
            f.write(data)
        print(f"Downloaded {outname}: size {im.size}, mode {im.mode}")
