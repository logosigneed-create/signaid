import os, sqlite3, shutil

src_history = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\History')
tmp_history = os.path.expanduser(r'~\AppData\Local\Temp\chrome_history_copy.db')

if os.path.exists(src_history):
    shutil.copy2(src_history, tmp_history)
    conn = sqlite3.connect(tmp_history)
    cur = conn.cursor()
    cur.execute("SELECT url, title, last_visit_time FROM urls WHERE url LIKE '%l-shop-team%' ORDER BY last_visit_time DESC LIMIT 50")
    rows = cur.fetchall()
    print("Found l-shop-team URLs:")
    for url, title, vt in rows:
        print(f"  {title} -> {url}")
    conn.close()
    try: os.remove(tmp_history)
    except: pass
