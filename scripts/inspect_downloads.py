import sqlite3, shutil, os

history_path = os.path.expanduser(r'~\AppData\Local\Google\Chrome\User Data\Default\History')
tmp_path = 'chrome_hist_copy.db'
shutil.copyfile(history_path, tmp_path)

conn = sqlite3.connect(tmp_path)
cur = conn.cursor()

print('=== DOWNLOADS ===')
try:
    for row in cur.execute("SELECT id, target_path, tab_url, start_time, total_bytes FROM downloads WHERE target_path LIKE '%2574824%'"):
        print(row)
        d_id = row[0]
        for chain in cur.execute("SELECT chain_index, url FROM downloads_url_chains WHERE id = ?", (d_id,)):
            print("  chain:", chain)
except Exception as e:
    print('Error downloads:', e)

print('=== ALL RECENT DOWNLOADS ===')
try:
    for row in cur.execute("SELECT id, target_path, tab_url, start_time, total_bytes FROM downloads ORDER BY start_time DESC LIMIT 10"):
        print(row)
        for chain in cur.execute("SELECT chain_index, url FROM downloads_url_chains WHERE id = ?", (row[0],)):
            print("  chain:", chain)
except Exception as e:
    print('Error:', e)
conn.close()
if os.path.exists(tmp_path):
    os.remove(tmp_path)
