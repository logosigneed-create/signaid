
import re

def check_jsx_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove strings and comments to avoid false positives
    content = re.sub(r'\{/\*.*?\*/\}', '', content)
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'`.*?`', '""', content, flags=re.DOTALL)
    content = re.sub(r'".*?"', '""', content)
    content = re.sub(r"'.*?'", "''", content)

    stack = []
    # Find all tags
    # Simplified: match <tag or </tag
    tag_iter = re.finditer(r'<(/?)([a-zA-Z0-9\-]+)', content)
    
    line_offsets = [0]
    for line in content.splitlines(keepends=True):
        line_offsets.append(line_offsets[-1] + len(line))

    def get_line(offset):
        for i, lo in enumerate(line_offsets):
            if lo > offset:
                return i
        return len(line_offsets)

    # List of void/self-closing elements in HTML/React
    void_elements = {'img', 'input', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'keygen', 'param', 'source', 'track', 'wbr'}

    for match in tag_iter:
        is_closing = match.group(1) == '/'
        tag_name = match.group(2)
        offset = match.start()
        line_num = get_line(offset)

        # Skip void elements (though in JSX they should be self-closing or have </tag>)
        # But many developers treat them as void.
        if tag_name in void_elements and not is_closing:
            # Check if it's explicitly self-closing <img />
            # We look ahead for the next '>'
            rest = content[match.end():content.find('>', match.end())+1]
            if '/>' not in rest:
                # In strict JSX, this would be an error, but let's assume it's okay for now
                # and focus on structural divs.
                if tag_name != 'div': # Div is never void
                    continue

        if is_closing:
            if stack and stack[-1][0] == tag_name:
                stack.pop()
            else:
                print(f"Mismatch: </{tag_name}> at line {line_num} doesn't match <{stack[-1][0] if stack else 'None'}>")
        else:
            # Check if self-closing <tag />
            # Find the closing '>' for this tag
            closing_bracket = content.find('>', offset)
            if closing_bracket != -1 and content[closing_bracket-1] == '/':
                continue
            stack.append((tag_name, line_num))

    if stack:
        print("Unclosed tags stack (oldest first):")
        for tag, line in stack:
            print(f"  <{tag}> at line {line}")
    else:
        print("All tags balanced!")

if __name__ == "__main__":
    check_jsx_balance("src/restoration/CustomizerView.Restored.tsx")
