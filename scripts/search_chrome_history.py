import os, sqlite3, shutil

# Chrome History is in AppData\Local\Google\Chrome\User Data\Default\History
src_history = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\History')
tmp_history = os.path.expanduser(r'~\AppData\Local\Temp\chrome_history_copy.db')

if os.path.exists(src_history):
    shutil.copy2(src_history, tmp_history)
    conn = sqlite3.connect(tmp_history)
    cur = conn.cursor()
    cur.execute("SELECT url, title, last_visit_time FROM urls WHERE url LIKE '%2574824%' OR url LIKE '%NX7200%' OR title LIKE '%NX7200%' OR url LIKE '%next-level%' OR url LIKE '%t-shirt%' ORDER BY last_visit_time DESC LIMIT 30")
    rows = cur.fetchall()
    print("Found in Chrome history:")
    for r in rows:
        print("  ", r)
    conn.close()
    try: os.remove(tmp_history)
    except: pass
else:
    print("Chrome history not found")
