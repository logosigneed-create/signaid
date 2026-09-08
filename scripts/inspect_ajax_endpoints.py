import re

with open('lshop_nx7200_full.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's search for ajax endpoints or URLs containing "index.php" or "cl="
endpoints = re.findall(r'["\']([^"\']*(?:cl=|ajax|variant|picture|oxmore)[^"\']*)["\']', html)
print(f"Endpoints found: {len(endpoints)}")
for ep in set(endpoints):
    if any(k in ep.lower() for k in ['pic', 'variant', 'color', 'detail', 'more']):
        print("  ", ep)

# Also let's find any JSON objects embedded in the page
# Look for var aVariants or similar
vars_found = re.findall(r'var\s+([a-zA-Z0-9_]+)\s*=\s*([\[\{].*?[\]\}]);', html)
for var_name, var_val in vars_found:
    print(f"Var {var_name}: length {len(var_val)}")
    if '2574824' in var_val or 'picture' in var_val.lower() or 'white' in var_val.lower():
        print(f"   -> Contains keyword! Preview: {var_val[:200]}")
