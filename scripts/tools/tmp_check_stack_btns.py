import re
p = 'c:\\Partage\\Projet\\Signaid V24\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read()

stack = []
for match in re.finditer(r'<button|</button>', content):
    tag = match.group()
    if tag == '<button':
        stack.append(match.start())
    else:
        if stack:
            stack.pop()
        else:
            print(f"Extra closing button at {match.start()}")

for pos in stack:
    line = content[:pos].count('\n') + 1
    print(f"Unclosed button at line {line}")
