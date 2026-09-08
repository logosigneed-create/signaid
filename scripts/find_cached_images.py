import os, time

now = time.time()
found = []

def scan(folder):
    for root, dirs, files in os.walk(folder):
        for f in files:
            p = os.path.join(root, f)
            try:
                st = os.stat(p)
                # check modified in last 2 hours
                if now - st.st_mtime < 7200 and st.st_size > 5000:
                    # check file signature
                    with open(p, 'rb') as fp:
                        hdr = fp.read(16)
                    if hdr.startswith(b'\x89PNG') or hdr.startswith(b'\xff\xd8\xff') or hdr.startswith(b'RIFF') and b'WEBP' in hdr:
                        found.append((st.st_mtime, st.st_size, p))
            except:
                pass

for top in [
    os.path.expanduser(r'~\AppData\Roaming\Antigravity'),
    os.path.expanduser(r'~\AppData\Roaming\Antigravity IDE'),
    os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\Cache'),
    os.path.expanduser(r'~\AppData\Local\Microsoft\Edge\User Data\Default\Cache'),
    os.path.expanduser(r'~\AppData\Local\Temp')
]:
    if os.path.exists(top):
        scan(top)

found.sort(reverse=True)
print(f"Total found: {len(found)}")
for mt, sz, p in found[:20]:
    print(f"{sz} bytes: {p}")
