import cv2
import numpy as np
import scipy.optimize as opt

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape
_, gt = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)

# Let's test the 5-shape model:
# 1. Top-Left Stem Block (4 points)
# 2. Bottom-Left Stem Block (4 points)
# 3. Top-Right Stem Block (4 points)
# 4. Bottom-Right Stem Block (4 points)
# 5. Diagonal Slash Blade (4 points / Bezier)

# 1. Top-Left Block
tl_block = np.array([[146, 86], [209, 46], [209, 243], [146, 289]], dtype=np.int32)

# 2. Bottom-Left Block
bl_block = np.array([[146, 353], [209, 325], [209, 397], [146, 435]], dtype=np.int32)

# 3. Top-Right Block
tr_block = np.array([[385, 70], [449, 30], [449, 205], [385, 245]], dtype=np.int32)

# 4. Bottom-Right Block
br_block = np.array([[385, 275], [449, 232], [449, 382], [385, 421]], dtype=np.int32)

# 5. Central Diagonal Slash Blade
# Running from (24, 396) through the middle to (569, 201)
# Top edge curve: (24,396) -> C (200, 310) (400, 240) -> (569, 201)
# Bottom edge curve: (569, 201) -> C (400, 250) (200, 320) -> (24, 396)

def sample_bezier(p0, p1, p2, p3, n=30):
    ts = np.linspace(0, 1, n)
    pts = []
    for t in ts:
        pt = (1-t)**3 * np.array(p0) + 3*(1-t)**2 * t * np.array(p1) + 3*(1-t) * t**2 * np.array(p2) + t**3 * np.array(p3)
        pts.append(pt)
    return np.array(pts)

slash_top = sample_bezier([24, 396], [220, 300], [400, 235], [569, 201])
slash_bot = sample_bezier([569, 201], [380, 255], [200, 325], [24, 396])
slash_poly = np.vstack([slash_top, slash_bot]).astype(np.int32)

canvas = np.zeros((h, w), dtype=np.uint8)
cv2.fillPoly(canvas, [tl_block, bl_block, tr_block, br_block, slash_poly], 255)

intersection = np.logical_and(gt > 0, canvas > 0).sum()
union = np.logical_or(gt > 0, canvas > 0).sum()
iou = intersection / union

print(f"5-Shape Model IoU: {iou * 100:.2f}%")

cv2.imwrite(r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\model_5shapes_preview.png', canvas)
