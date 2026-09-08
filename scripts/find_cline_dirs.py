import os, time

bases = [
    os.path.expanduser(r'~\AppData\Roaming\Antigravity\User\globalStorage\saoudrizwan.claude-dev'),
    os.path.expanduser(r'~\AppData\Roaming\Antigravity IDE\User\globalStorage\saoudrizwan.claude-dev')
]

for base in bases:
    if os.path.exists(base):
        print("Checking base:", base)
        for root, dirs, files in os.walk(base):
            for f in files:
                if f.endswith('.json'):
                    fp = os.path.join(root, f)
                    if time.time() - os.path.getmtime(fp) < 3600:
                        print("  Recent JSON:", fp, os.path.getsize(fp))

