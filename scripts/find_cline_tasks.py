import os, sqlite3, json

# 1. Check workspaceStorage
ws_dir = os.path.expanduser(r'~\AppData\Roaming\Code\User\workspaceStorage')
for ws in os.listdir(ws_dir):
    p = os.path.join(ws_dir, ws)
    vscdb = os.path.join(p, 'state.vscdb')
    if os.path.exists(vscdb):
        try:
            conn = sqlite3.connect(vscdb)
            cur = conn.cursor()
            cur.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%task%' OR key LIKE '%claude%' OR key LIKE '%cline%'")
            rows = cur.fetchall()
            if rows:
                print(f"In {ws}:")
                for r in rows:
                    print("  ", r)
            conn.close()
        except Exception as e:
            pass

# 2. Check globalStorage state.vscdb
global_vscdb = os.path.expanduser(r'~\AppData\Roaming\Code\User\globalStorage\state.vscdb')
if os.path.exists(global_vscdb):
    try:
        conn = sqlite3.connect(global_vscdb)
        cur = conn.cursor()
        cur.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%task%' OR key LIKE '%claude%' OR key LIKE '%cline%'")
        rows = cur.fetchall()
        print("In global state.vscdb:")
        for r in rows:
            print("  ", r)
        conn.close()
    except Exception as e:
        pass
