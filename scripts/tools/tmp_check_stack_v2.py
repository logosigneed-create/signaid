import re
p = 'c:\Partage\Projet\signaid-studio\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read()

stack = []
# Regex to find <tag, </tag>, <>, </>, or />
# This is tricky in regex but we try
token_re = re.compile(r'<(/?)([a-zA-Z0-9-]+|<>|</>)|(/>)')

for match in token_re.finditer(content):
    is_close = match.group(1) == '/'
    is_self_close = match.group(3) == '/>'
    tag = match.group(2)
    
    if is_self_close:
        if stack: stack.pop()
    elif is_close:
        if stack and stack[-1] == tag:
            stack.pop()
        else:
            print(f"Mismatch: extra {tag} at line {content[:match.start()].count('\n')+1}")
    else:
        stack.append(tag)

print("Still open:", stack)
