import os
import re

search_paths = [
    r"c:\Partage\Projet\signaid-studio",
    r"c:\Partage\Projet\signaid-vitrine"
]

matches = []

for base in search_paths:
    for root, dirs, files in os.walk(base):
        if any(skip in root for skip in ["node_modules", ".git", "dist", ".next", ".firebase"]):
            continue
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in ['.svg', '.json', '.ts', '.tsx', '.js', '.py', '.md', '.txt', '.csv']:
                full_path = os.path.join(root, f)
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as file_obj:
                        content = file_obj.read()
                        if 'dfazz' in content.lower() or 'd-fazz' in content.lower() or 'fabrizio' in content.lower():
                            matches.append((full_path, f))
                except Exception:
                    pass

print(f"Total matching files found: {len(matches)}")
for path, fname in matches:
    print(f"Match: {fname} -> {path}")
