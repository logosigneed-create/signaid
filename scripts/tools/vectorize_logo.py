import cv2
import numpy as np

# Load original raster image
img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape

# High precision thresholding
_, thresh = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)

# Extract main contours
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
contours = sorted(contours, key=cv2.contourArea, reverse=True)[:2]

paths_d = []
for cnt in contours:
    # 1.0px tolerance to maintain sharp corners and smooth curves
    approx = cv2.approxPolyDP(cnt, 1.0, True)
    pts = approx.squeeze()
    
    d_str = f"M {pts[0][0]},{pts[0][1]}"
    for p in pts[1:]:
        d_str += f" L {p[0]},{p[1]}"
    d_str += " Z"
    paths_d.append(d_str)

# Build clean SVG string
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="100%" height="100%">
  <!-- Background -->
  <rect width="{w}" height="{h}" fill="#000000"/>
  <!-- Stylized H Logo -->
  <g fill="#ffffff">
    <path d="{paths_d[0]}" />
    <path d="{paths_d[1]}" />
  </g>
</svg>'''

output_svg_path = r'c:\Partage\Projet\Signaid V24\logo.svg'
with open(output_svg_path, 'w', encoding='utf-8') as f:
    f.write(svg_content)

print(f"SVG saved to {output_svg_path}")
