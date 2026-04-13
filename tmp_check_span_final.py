import re
p = 'c:\\Partage\\Projet\\Signaid V24\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read().splitlines()

for i, line in enumerate(content):
    opens = line.count('<span')
    closes = line.count('</span>')
    if opens != closes:
        print(f"Line {i+1}: {opens} vs {closes} | {line.strip()}")
