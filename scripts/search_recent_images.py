import os, time

now = time.time()
found = []
# search in Temp and AppData
for base in [os.environ.get('TEMP'), os.environ.get('APPDATA'), os.environ.get('LOCALAPPDATA')]:
    if not base or not os.path.exists(base): continue
    for root, dirs, files in os.walk(base):
        # skip massive folders
        if 'node_modules' in root or 'Cache' in root or 'cache' in root:
            continue
        for f in files:
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                p = os.path.join(root, f)
                try:
                    mt = os.path.getmtime(p)
                    if now - mt < 14400: # last 4 hours
                        found.append((mt, os.path.getsize(p), p))
                except:
                    pass

found.sort(reverse=True)
print(f"Found {len(found)} images:")
for mt, sz, p in found[:30]:
    print(f"{sz} bytes, mtime: {time.ctime(mt)} -> {p}")
