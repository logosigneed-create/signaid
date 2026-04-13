import re
p = 'c:\\Partage\\Projet\\Signaid V24\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read().splitlines()

for i, line in enumerate(content):
    if '<button' in line and '</button>' not in line:
        # Check if it ends on this line or next
        print(f"Began at line {i+1}: {line.strip()}")
    if '</button>' in line and '<button' not in line:
        print(f"Ended at line {i+1}: {line.strip()}")
