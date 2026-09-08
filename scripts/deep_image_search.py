import os, time
from PIL import Image

now = time.time()
found = []

for base in [
    os.path.expanduser(r'~\AppData\Roaming'),
    os.path.expanduser(r'~\AppData\Local'),
    os.path.expanduser(r'~\Downloads'),
    os.path.expanduser(r'~\Desktop')
]:
    for root, dirs, files in os.walk(base):
        # Only skip Windows system internals or huge git folders
        if '.git' in root or 'AppData\\Local\\Microsoft\\Windows' in root:
            continue
        for f in files:
            p = os.path.join(root, f)
            try:
                st = os.stat(p)
                if now - st.st_mtime < 7200 and 10000 < st.st_size < 10000000:
                    with open(p, 'rb') as fp:
                        hdr = fp.read(16)
                    if hdr.startswith(b'\x89PNG') or hdr.startswith(b'\xff\xd8\xff') or (hdr.startswith(b'RIFF') and b'WEBP' in hdr):
                        found.append((st.st_mtime, st.st_size, p))
            except:
                pass

found.sort(reverse=True)
print(f"Total matching images in last 2h: {len(found)}")
for mt, sz, p in found[:30]:
    try:
        im = Image.open(p)
        print(f"{sz}b, {im.size}, {im.format} : {p}")
    except:
        print(f"{sz}b : {p}")
