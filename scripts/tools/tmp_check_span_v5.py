import re
p = 'c:\Partage\Projet\signaid-studio\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read()

# Only match open spans (not closed)
opens = len(re.findall(r'<span\b', content))
closes = len(re.findall(r'</span>', content))
print(f"Spans: {opens} vs {closes}")
