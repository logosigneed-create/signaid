import os, time

cache_dir = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\Cache\Cache_Data')
now = time.time()

recent_files = []
for f in os.listdir(cache_dir):
    fp = os.path.join(cache_dir, f)
    try:
        mt = os.path.getmtime(fp)
        if now - mt < 14400: # last 4 hours
            recent_files.append((mt, fp))
    except:
        pass

print(f"Total recent cache files: {len(recent_files)}")
matches = []
for mt, fp in recent_files:
    try:
        with open(fp, 'rb') as s:
            data = s.read()
            if b'2574' in data or b'shop-team' in data or b'NX7200' in data:
                # Find all URLs or mentions
                idx = 0
                while True:
                    idx = data.find(b'http', idx)
                    if idx == -1: break
                    end_idx = min(len(data), idx + 250)
                    chunk = data[idx:end_idx]
                    url_bytes = bytearray()
                    for b in chunk:
                        if 32 <= b <= 126:
                            url_bytes.append(b)
                        else:
                            break
                    url_str = url_bytes.decode('ascii', errors='ignore')
                    if any(x in url_str for x in ['shop-team', '2574', 'NX7200']):
                        matches.append((os.path.basename(fp), url_str))
                    idx += 4
    except:
        pass

seen = set()
for f, u in matches:
    if u not in seen:
        seen.add(u)
        print(f"{f}: {u}")
