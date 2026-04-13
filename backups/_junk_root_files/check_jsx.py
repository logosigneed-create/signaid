
import re

def check_jsx_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    stack = []
    # Simplified regex for tags
    tag_pattern = re.compile(r'<(div|/div|button|/button|span|/span|h\d|/h\d|i|/i|label|/label|textarea|/textarea|style|/style|section|/section|header|/header|footer|/footer|nav|/nav|main|/main|article|/article|aside|/aside|ul|/ul|li|/li|p|/p|form|/form|input|img|br|hr)(?:\s|>|/)')
    
    for i, line in enumerate(lines):
        # Ignore comments
        line = re.sub(r'\{/\*.*?\*/\}', '', line)
        line = re.sub(r'//.*', '', line)
        
        matches = tag_pattern.finditer(line)
        for match in matches:
            tag_name = match.group(1)
            # Ignore self-closing or singleton tags
            if tag_name in ['input', 'img', 'br', 'hr']:
                continue
            
            # Check for self-closing syntax like <div />
            if '/>' in match.group(0) or (match.end() < len(line) and line[match.end()] == '/'):
                continue

            if tag_name.startswith('/'):
                short_name = tag_name[1:]
                if stack and stack[-1][0] == short_name:
                    stack.pop()
                else:
                    print(f"Error: Unexpected closing tag </{short_name}> at line {i+1}")
                    if stack:
                        print(f"  Current stack top: <{stack[-1][0]}> from line {stack[-1][1]}")
            else:
                stack.append((tag_name, i+1))

    if stack:
        print(f"Error: Unclosed tags remaining:")
        for tag, line_num in stack:
            print(f"  <{tag}> from line {line_num}")

if __name__ == "__main__":
    check_jsx_balance("src/restoration/CustomizerView.Restored.tsx")
