import os

def search_text():
    targets = [b'peux tu encoder', b'NX7200', b'Heavyweight']
    bases = [
        os.path.expanduser(r'~\AppData\Roaming\Antigravity'),
        os.path.expanduser(r'~\AppData\Roaming\Antigravity IDE'),
        os.path.expanduser(r'~\AppData\Roaming\Code'),
        os.path.expanduser(r'~\AppData\Local\Temp')
    ]
    for b in bases:
        if not os.path.exists(b): continue
        for root, dirs, files in os.walk(b):
            if 'node_modules' in root or 'Cache' in root or '.git' in root: continue
            for f in files:
                p = os.path.join(root, f)
                try:
                    with open(p, 'rb') as fp:
                        data = fp.read()
                        for t in targets:
                            if t in data:
                                print(f"Found {t.decode()} in {p} (size {len(data)})")
                                # find where it is
                                idx = data.find(t)
                                snippet = data[max(0, idx-100):min(len(data), idx+300)]
                                print("   Snippet:", repr(snippet))
                                break
                except Exception:
                    pass

search_text()

