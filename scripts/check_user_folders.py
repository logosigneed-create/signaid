import os, time

user = os.environ['USERPROFILE']
for folder_name in ['Downloads', 'Desktop', 'Pictures', 'Documents']:
    folder = os.path.join(user, folder_name)
    if not os.path.exists(folder): continue
    print(f"=== {folder_name} ===")
    for f in os.listdir(folder):
        p = os.path.join(folder, f)
        if os.path.isfile(p):
            try:
                mt = os.path.getmtime(p)
                # modified today (last 24 hours)
                if time.time() - mt < 86400:
                    print(f"  {time.ctime(mt)} | {os.path.getsize(p):8d} | {f}")
            except:
                pass
