import sys

def audit_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    div_balance = 0
    portal_balance = 0
    bracket_balance = 0
    brace_balance = 0
    
    in_return = False
    
    for i, line in enumerate(lines):
        line_num = i + 1
        
        if 'return (' in line:
            print(f"--- Enter Return at line {line_num} ---")
            in_return = True
        
        if in_return:
            div_balance += line.count('<div') - line.count('</div>')
            # Look for createPortal and comma-separated second arg
            portal_balance += line.count('createPortal(') - line.count(', document.body)')
            bracket_balance += line.count('(') - line.count(')')
            brace_balance += line.count('{') - line.count('}')
            
            if line_num >= 2139: # Focus on the portal transition zone
                 print(f"{line_num:4}: Div:{div_balance:2} Port:{portal_balance:2} Brk:{bracket_balance:2} Brc:{brace_balance:2} | {line.strip()[:60]}")

        if '};' in line and in_return:
            print(f"--- Exit Component at line {line_num} ---")
            break
    
    print(f"\nFINAL BALANCES:")
    print(f"Div: {div_balance}")
    print(f"Portals: {portal_balance}")
    print(f"Brackets: {bracket_balance}")
    print(f"Braces: {brace_balance}")

if __name__ == "__main__":
    audit_file('c:/Partage/Projet/Signaid V7/src/restoration/CustomizerView.Restored.tsx')
