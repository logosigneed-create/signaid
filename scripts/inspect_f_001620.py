import os, re

cache_dir = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\Cache\Cache_Data')
fpath = os.path.join(cache_dir, 'f_001620')
with open(fpath, 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

print('Length of f_001620:', len(content))
imgs = re.findall(r'[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', content, re.IGNORECASE)
print(f'Total images found: {len(imgs)}')
for img in set(imgs):
    if any(k in img.lower() for k in ['product', '2574', 'out', 'l-shop', 'pictures', 'nx7200', 'heavyweight']):
        print('  ', img)
