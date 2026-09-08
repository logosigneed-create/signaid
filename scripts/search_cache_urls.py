import os

cache_dir = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\Cache\Cache_Data')

matches = []
for f in os.listdir(cache_dir):
    fp = os.path.join(cache_dir, f)
    try:
        with open(fp, 'rb') as s:
            data = s.read()
            if b'2574824' in data or b'shop-team' in data:
                # Find all URLs or mentions
                idx = 0
                while True:
                    idx = data.find(b'http', idx)
                    if idx == -1: break
                    end_idx = min(len(data), idx + 250)
                    chunk = data[idx:end_idx]
                    # find null byte or non-ascii
                    url_bytes = bytearray()
                    for b in chunk:
                        if 32 <= b <= 126:
                            url_bytes.append(b)
                        else:
                            break
                    url_str = url_bytes.decode('ascii', errors='ignore')
                    if 'l-shop-team' in url_str or '2574824' in url_str:
                        matches.append((f, url_str))
                    idx += 4
    except:
        pass

print(f"Found {len(matches)} matches:")
seen = set()
for f, u in matches:
    if u not in seen:
        seen.add(u)
        print(f"{f}: {u}")
