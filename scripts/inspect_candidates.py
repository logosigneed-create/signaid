import os
from PIL import Image

cache = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\Cache\Cache_Data')
downloads = os.path.expanduser(r'~\Downloads')

candidates = [
    os.path.join(downloads, '25744824.jpg'),
    os.path.join(cache, 'f_0017e0'),
    os.path.join(cache, 'f_0017df'),
    os.path.join(cache, 'f_0017de'),
    os.path.join(cache, 'f_0017f7'),
    os.path.join(cache, 'f_0017f6'),
    os.path.join(cache, 'f_0017d6'),
    os.path.join(cache, 'f_0017b2')
]

for p in candidates:
    if os.path.exists(p):
        try:
            im = Image.open(p)
            print(f"{os.path.basename(p)}: size={im.size}, mode={im.mode}, format={im.format}")
            # check dominant color or average color
            im_rgb = im.convert('RGB')
            # sample center pixel or mean
            colors = im_rgb.resize((10, 10)).getdata()
            avg_r = sum(c[0] for c in colors) / 100
            avg_g = sum(c[1] for c in colors) / 100
            avg_b = sum(c[2] for c in colors) / 100
            print(f"   Avg RGB: ({avg_r:.1f}, {avg_g:.1f}, {avg_b:.1f})")
        except Exception as e:
            print(f"{p}: error {e}")
