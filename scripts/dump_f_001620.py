import os, re

cache_dir = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\Cache\Cache_Data')
fpath = os.path.join(cache_dir, 'f_001620')
with open(fpath, 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

with open('f_001620_dump.html', 'w', encoding='utf-8') as out:
    out.write(content)

imgs = re.findall(r'https?://[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', content, re.IGNORECASE)
with open('f_001620_imgs.txt', 'w', encoding='utf-8') as out:
    for u in sorted(set(imgs)):
        out.write(u + '\n')
print(f"Dumped {len(imgs)} images to f_001620_imgs.txt")
