import cv2
import numpy as np
import re

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape

with open(r'c:\Partage\Projet\Signaid V24\logo.svg', 'r', encoding='utf-8') as f:
    svg_text = f.read()

d_matches = re.findall(r'd="([^"]+)"', svg_text)

canvas = np.zeros((h, w), dtype=np.uint8)
for d in d_matches:
    pts = []
    tokens = d.split()
    i = 0
    while i < len(tokens):
        if tokens[i] in ['M', 'L']:
            coords = tokens[i+1].split(',')
            pts.append([int(coords[0]), int(coords[1])])
            i += 2
        elif tokens[i] == 'Z':
            break
        else:
            i += 1
    cv2.fillPoly(canvas, [np.array(pts, dtype=np.int32)], 255)

out_preview = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\vector_preview.png'
cv2.imwrite(out_preview, canvas)
print(f"Vector preview saved to {out_preview}")
