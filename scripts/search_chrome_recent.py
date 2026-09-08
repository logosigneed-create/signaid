import os, sqlite3, shutil, time

src_history = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\History')
tmp_history = os.path.expanduser(r'~\AppData\Local\Temp\chrome_history_copy.db')

if os.path.exists(src_history):
    shutil.copy2(src_history, tmp_history)
    conn = sqlite3.connect(tmp_history)
    cur = conn.cursor()
    # Chrome timestamp is microseconds since 1601-01-01
    # Unix epoch is 11644473600 seconds after 1601-01-01
    epoch_start = 11644473600
    cutoff = int((time.time() - 6 * 3600 + epoch_start) * 1000000)
    cur.execute("SELECT url, title FROM urls WHERE last_visit_time > ? ORDER BY last_visit_time DESC", (cutoff,))
    rows = cur.fetchall()
    print(f"Found {len(rows)} URLs visited in last 6h:")
    for url, title in rows:
        print(f"  [{title}] -> {url}")
    conn.close()
    try: os.remove(tmp_history)
    except: pass
