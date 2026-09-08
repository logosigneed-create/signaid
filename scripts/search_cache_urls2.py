import os, time

cache_dir = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\Cache\Cache_Data')
now = time.time()

for f in os.listdir(cache_dir):
    fp = os.path.join(cache_dir, f)
    try:
        mt = os.path.getmtime(fp)
        if now - mt < 14400: # last 4 hours
            with open(fp, 'rb') as s:
                data = s.read()
                # Chrome cache file ends with URL metadata at the end of the file!
                # In Chrome simple cache format, the key (URL) is near the end!
                if b'http' in data:
                    # search from end of file
                    idx = data.rfind(b'http')
                    end_idx = min(len(data), idx + 200)
                    url = data[idx:end_idx].split(b'\x00')[0]
                    try:
                        u_str = url.decode('ascii', errors='ignore')
                        if 'l-shop' in u_str or 'jpg' in u_str or 'png' in u_str or 'webp' in u_str or '257' in u_str:
                            print(f"{f} ({len(data)}b): {u_str}")
                    except:
                        pass
    except:
        pass
