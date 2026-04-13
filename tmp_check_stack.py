import re
p = 'c:\\Partage\\Projet\\Signaid V24\\src\\components\\CustomizerView.Simple.tsx'
content = open(p, 'r', encoding='utf-8').read()

# Stack based tag matching
tag_regex = re.compile(r'<(div|p|span|i|button|h2|h3|label|<>|</>|<>|/?>)')
# Actually just use a stack of open tags
stack = []
for match in re.finditer(r'<(/?[a-zA-Z0-9-]+|<>|</>)', content):
    tag = match.group(1)
    if tag.startswith('/'):
        clean_tag = tag[1:]
        if stack and stack[-1] == clean_tag:
            stack.pop()
        else:
            print(f"Extra closing tag: {tag} at byte {match.start()}")
    elif not tag.endswith('/'): # Ignore self closing if any
        stack.append(tag)

print("Remaining open:", stack)
