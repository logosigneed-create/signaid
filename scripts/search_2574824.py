import os, sqlite3, shutil

src_history = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\History')
tmp_history = os.path.expanduser(r'~\AppData\Local\Temp\chrome_history_copy.db')

if os.path.exists(src_history):
    shutil.copy2(src_history, tmp_history)
    conn = sqlite3.connect(tmp_history)
    cur = conn.cursor()
    cur.execute("SELECT url, title FROM urls WHERE url LIKE '%2574824%'")
    rows = cur.fetchall()
    print("Found exact 2574824 URLs:")
    for url, title in rows:
        print(f"  {title} -> {url}")
    
    cur.execute("SELECT target_path, tab_url FROM downloads WHERE target_path LIKE '%2574824%'")
    rows2 = cur.fetchall()
    print("Found in Chrome downloads:")
    for p, u in rows2:
        print(f"  {p} from {u}")
        
    conn.close()
    try: os.remove(tmp_history)
    except: pass
