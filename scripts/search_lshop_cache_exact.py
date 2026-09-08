import os, re

cache_dir = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\Cache\Cache_Data')

matches = []
for fname in os.listdir(cache_dir):
    fpath = os.path.join(cache_dir, fname)
    if not os.path.isfile(fpath):
        continue
    try:
        with open(fpath, 'rb') as f:
            data = f.read()
            if b'l-shop-team' in data or b'master/product' in data or b'25748' in data:
                # Find all URLs or mentions
                urls = re.findall(rb'https?://[^ \x00-\x1f\"\'<>]+', data)
                for u in urls:
                    if b'l-shop-team' in u or b'25748' in u:
                        matches.append((fname, u.decode('utf-8', errors='ignore')))
    except Exception as e:
        pass

print(f"Found {len(matches)} matches:")
for m in set(matches):
    print(m)
