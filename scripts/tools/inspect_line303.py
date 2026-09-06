import sys

html_path = r'c:\Partage\Projet\signaid-studio\vector_editor.html'
with open(html_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
for idx in range(max(0, 290), min(len(lines), 315)):
    print(f"Line {idx+1}: {lines[idx].rstrip()}")
