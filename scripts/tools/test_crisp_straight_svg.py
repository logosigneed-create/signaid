import cv2
import numpy as np

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape
_, gt = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)

def sample_bezier(p0, p1, p2, p3, n=30):
    ts = np.linspace(0, 1, n)
    pts = []
    for t in ts:
        pt = (1-t)**3 * np.array(p0) + 3*(1-t)**2 * t * np.array(p1) + 3*(1-t) * t**2 * np.array(p2) + t**3 * np.array(p3)
        pts.append(pt)
    return np.array(pts)

# Upper Shape: 100% PURE STRAIGHT LINES (L)
poly_up = np.array([
    [449, 30],
    [386, 70],
    [385, 194],
    [209, 243],
    [209, 46],
    [147, 86],
    [146, 301],
    [449, 205]
], dtype=np.int32)

# Lower Shape: Pure straight lines (L) + 1 single curve C for the main razor blade
c_l_blade = sample_bezier([569, 201], [353, 227], [153, 307], [24, 396])
poly_dn = np.vstack([
    [[569, 201]],
    c_l_blade,
    [[24, 396]], [[145, 353]], [[147, 435]], [[209, 397]], [[210, 325]],
    [[385, 254]], [[385, 421]], [[449, 382]], [[449, 232]]
]).astype(np.int32)

canvas = np.zeros((h, w), dtype=np.uint8)
cv2.fillPoly(canvas, [poly_up, poly_dn], 255)

intersection = np.logical_and(gt > 0, canvas > 0).sum()
union = np.logical_or(gt > 0, canvas > 0).sum()
iou = intersection / union

print(f"Hybrid Pure Straight Lines + 1 Blade Curve IoU: {iou * 100:.2f}%")

artifact_dir = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce'
cv2.imwrite(artifact_dir + r'\crisp_straight_preview.png', canvas)

# Output pure SVG string
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 581 481" width="100%" height="100%">
  <!-- Arrière-plan (noir) -->
  <rect width="581" height="481" fill="#000000"/>
  
  <!-- Logo H Stylisé (Tout en Lignes Droites L) -->
  <g fill="#ffffff">
    <!-- Partie Supérieure (100% Lignes Droites L) -->
    <path d="M 449,30 L 386,70 L 385,194 L 209,243 L 209,46 L 147,86 L 146,301 L 449,205 Z" />
    
    <!-- Partie Inférieure (100% Lignes Droites L + 1 Seule Courbe pour la Lame) -->
    <path d="M 569,201 C 353,227 153,307 24,396 L 145,353 L 147,435 L 209,397 L 210,325 L 385,254 L 385,421 L 449,382 L 449,232 Z" />
  </g>
</svg>'''

with open(r'c:\Partage\Projet\Signaid V24\logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

with open(artifact_dir + r'\logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)
