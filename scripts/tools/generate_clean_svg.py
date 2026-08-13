import cv2
import numpy as np
import re

svg_code = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 581 481" width="100%" height="100%">
  <!-- Background -->
  <rect width="581" height="481" fill="#000000"/>
  
  <!-- Stylized H Logo (Minimal Anchors) -->
  <g fill="#ffffff">
    <!-- Upper Shape -->
    <path d="M 449,30 L 386,70 L 385,194 C 342,205 277,230 209,243 L 209,46 L 147,86 L 146,301 C 274,248 430,192 569,201 L 449,205 Z" />
    <!-- Lower Shape -->
    <path d="M 569,201 C 371,225 171,296 24,396 L 145,353 L 145,435 L 209,397 L 210,325 C 271,299 335,271 385,254 L 385,421 L 449,382 L 449,232 Z" />
  </g>
</svg>'''

# Save to project
with open(r'c:\Partage\Projet\Signaid V24\logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_code)

# Save to artifact dir
artifact_dir = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce'
with open(artifact_dir + r'\logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_code)

# Render preview PNG for visual validation
def parse_path_pts(d_str):
    # Sample path points for visualization
    # We use cv2.fillPoly with sampled points from cubic bezier curves
    tokens = d_str.split()
    pts = []
    i = 0
    curr = [0, 0]
    while i < len(tokens):
        cmd = tokens[i]
        if cmd == 'M':
            coords = list(map(int, tokens[i+1].split(',')))
            curr = coords
            pts.append(curr)
            i += 2
        elif cmd == 'L':
            coords = list(map(int, tokens[i+1].split(',')))
            curr = coords
            pts.append(curr)
            i += 2
        elif cmd == 'C':
            c1 = list(map(int, tokens[i+1].split(',')))
            c2 = list(map(int, tokens[i+2].split(',')))
            p3 = list(map(int, tokens[i+3].split(',')))
            # sample bezier curve
            ts = np.linspace(0, 1, 30)
            for t in ts:
                pt = (1-t)**3 * np.array(curr) + 3*(1-t)**2 * t * np.array(c1) + 3*(1-t) * t**2 * np.array(c2) + t**3 * np.array(p3)
                pts.append(pt.astype(int).tolist())
            curr = p3
            i += 4
        elif cmd == 'Z':
            break
        else:
            i += 1
    return np.array(pts, dtype=np.int32)

up_d = "M 449,30 L 386,70 L 385,194 C 342,205 277,230 209,243 L 209,46 L 147,86 L 146,301 C 274,248 430,192 569,201 L 449,205 Z"
dn_d = "M 569,201 C 371,225 171,296 24,396 L 145,353 L 145,435 L 209,397 L 210,325 C 271,299 335,271 385,254 L 385,421 L 449,382 L 449,232 Z"

canvas = np.zeros((481, 581), dtype=np.uint8)
cv2.fillPoly(canvas, [parse_path_pts(up_d)], 255)
cv2.fillPoly(canvas, [parse_path_pts(dn_d)], 255)

cv2.imwrite(artifact_dir + r'\vector_preview.png', canvas)
print("Ultra-clean SVG and preview saved successfully!")
