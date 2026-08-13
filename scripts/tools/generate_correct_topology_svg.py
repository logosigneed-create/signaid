import cv2
import numpy as np

svg_code = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 581 481" width="100%" height="100%">
  <!-- Arrière-plan (noir) -->
  <rect width="581" height="481" fill="#000000"/>
  
  <!-- Logo H Stylisé & Tranché (Seulement 17 points ancres au total) -->
  <g fill="#ffffff">
    <!-- Partie Supérieure de la Lettre H -->
    <path d="M 449,30 L 386,70 L 385,194 C 333,209 266,228 209,243 L 209,46 L 147,86 L 146,301 C 224,267 378,215 449,205 Z" />
    
    <!-- Partie Inférieure de la Lettre H + Lame Diagonale -->
    <path d="M 569,201 C 353,227 153,307 24,396 L 145,353 L 147,435 L 209,397 L 210,325 C 267,300 329,272 385,254 L 385,421 L 449,382 L 449,232 Z" />
  </g>
</svg>'''

# Save to project
with open(r'c:\Partage\Projet\Signaid V24\logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_code)

# Save to artifact dir
artifact_dir = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce'
with open(artifact_dir + r'\logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_code)

# Render accurate preview PNG
def sample_bezier(p0, p1, p2, p3, n=30):
    ts = np.linspace(0, 1, n)
    pts = []
    for t in ts:
        pt = (1-t)**3 * np.array(p0) + 3*(1-t)**2 * t * np.array(p1) + 3*(1-t) * t**2 * np.array(p2) + t**3 * np.array(p3)
        pts.append(pt)
    return np.array(pts)

# Build upper poly
c_u_in = sample_bezier([385, 194], [333, 209], [266, 228], [209, 243])
c_u_out = sample_bezier([146, 301], [224, 267], [378, 215], [449, 205])
poly_up = np.vstack([
    [[449, 30]], [[386, 70]], [[385, 194]],
    c_u_in,
    [[209, 243]], [[209, 46]], [[147, 86]], [[146, 301]],
    c_u_out,
    [[449, 205]]
]).astype(np.int32)

# Build lower poly
c_l_blade = sample_bezier([569, 201], [353, 227], [153, 307], [24, 396])
c_l_in = sample_bezier([210, 325], [267, 300], [329, 272], [385, 254])
poly_dn = np.vstack([
    [[569, 201]],
    c_l_blade,
    [[24, 396]], [[145, 353]], [[147, 435]], [[209, 397]], [[210, 325]],
    c_l_in,
    [[385, 254]], [[385, 421]], [[449, 382]], [[449, 232]]
]).astype(np.int32)

canvas = np.zeros((481, 581), dtype=np.uint8)
cv2.fillPoly(canvas, [poly_up, poly_dn], 255)

cv2.imwrite(artifact_dir + r'\vector_preview.png', canvas)
print("Corrected SVG and preview rendered successfully!")
