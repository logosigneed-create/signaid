import re
p = 'c:\\Partage\\Projet\\Signaid V24\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read()

tags = ['div', 'p', 'span', 'i', 'button', 'h2', 'h3', 'label']
for t in tags:
    open_tag = len(re.findall(r'<' + t + r'\b[^>]*[^/]>', content))
    close_tag = len(re.findall(r'</' + t + r'>', content))
    if open_tag != close_tag:
        print(f"{t}: {open_tag} open vs {close_tag} closed")

# Fragments
frag_open = content.count('<>')
frag_close = content.count('</>')
print(f"Fragments: {frag_open} open vs {frag_close} closed")
