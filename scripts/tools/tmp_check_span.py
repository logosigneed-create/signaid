import re
p = 'c:\Partage\Projet\signaid-studio\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read()

opens = len(re.findall(r'<span', content))
closes = len(re.findall(r'</span>', content))
print(f"Spans: {opens} vs {closes}")

btns_open = len(re.findall(r'<button', content))
btns_close = len(re.findall(r'</button>', content))
print(f"Buttons: {btns_open} vs {btns_close}")
