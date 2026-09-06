import re
p = 'c:\Partage\Projet\signaid-studio\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read().splitlines()

for i, line in enumerate(content):
    opens = len(re.findall(r'<button', line))
    closes = len(re.findall(r'</button>', line))
    if opens != closes:
        print(f"Line {i+1}: {opens} vs {closes} | {line.strip()}")
