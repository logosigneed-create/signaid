import os, time

now = time.time()
found = []
dirs_to_check = [
    os.path.join(os.environ['USERPROFILE'], 'Downloads'),
    os.path.join(os.environ['USERPROFILE'], 'Desktop'),
    os.path.join(os.environ['USERPROFILE'], 'Pictures'),
    os.path.join(os.environ['USERPROFILE'], 'AppData', 'Local', 'Temp'),
    os.path.join(os.environ['USERPROFILE'], 'AppData', 'Roaming', 'Code', 'User', 'workspaceStorage')
]

for d in dirs_to_check:
    if not os.path.exists(d):
        continue
    for root, dirs, files in os.walk(d):
        for f in files:
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                fp = os.path.join(root, f)
                try:
                    mt = os.path.getmtime(fp)
                    if now - mt < 7200:
                        found.append((mt, os.path.getsize(fp), fp))
                except:
                    pass

found.sort(reverse=True)
print(f"Found {len(found)} recent images:")
for mt, sz, fp in found[:40]:
    print(f"{sz} bytes: {fp}")

