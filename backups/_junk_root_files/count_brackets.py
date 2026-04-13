
def analyze_brackets(text, start_line):
    p = 0
    b = 0
    s = 0
    for i, line in enumerate(text.splitlines()):
        for char in line:
            if char == '(': p += 1
            if char == ')': p -= 1
            if char == '{': b += 1
            if char == '}': b -= 1
            if char == '[': s += 1
            if char == ']': s -= 1
        print(f"{start_line + i}: p={p}, b={b}, s={s} | {line[:80]}")

with open("c:/Partage/Projet/Signaid V7/src/restoration/CustomizerView.Restored.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("Import Panel Audit (2140-2160):")
analyze_brackets("".join(lines[2139:2160]), 2140)
