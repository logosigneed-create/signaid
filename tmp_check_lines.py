import re
p = 'c:\\Partage\\Projet\\Signaid V24\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read().splitlines()

stack = []
for i, line in enumerate(content):
    # This is rough but good for locating errors
    for match in re.finditer(r'<(div|button|span|i|p|h3|h2)\b|/(div|button|span|i|p|h3|h2)>', line):
        tag = match.group(0)
        if tag.startswith('</'):
            tag_name = tag[2:-1]
            if stack and stack[-1][0] == tag_name:
                stack.pop()
            else:
                print(f"Mismatch/Extra close at line {i+1}: {tag}")
        elif not tag.endswith('/>'):
            tag_name = tag[1:]
            stack.append((tag_name, i+1))

print("Unclosed tags at end of file:")
for t, line in stack:
    print(f"{t} opened at line {line}")
