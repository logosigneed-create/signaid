import os, time
from PIL import Image

now = time.time()
found = []

user_profile = os.environ['USERPROFILE']

for root, dirs, files in os.walk(user_profile):
    # skip heavy/irrelevant dirs
    if any(skip in root for skip in ['AppData\\Local\\Microsoft\\Windows', '.git', 'node_modules', 'venv', '.conda', 'AppData\\Local\\Package']):
        continue
    for f in files:
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            p = os.path.join(root, f)
            try:
                st = os.stat(p)
                # modified in the last 3 hours
                if now - st.st_mtime < 10800:
                    found.append((st.st_mtime, st.st_size, p))
            except:
                pass

found.sort(reverse=True)
print(f"Found {len(found)} images in user profile in last 3h:")
for mt, sz, p in found[:50]:
    print(f"{time.ctime(mt)} | {sz:8d} | {p}")
