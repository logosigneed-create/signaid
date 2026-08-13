import cv2
import numpy as np

# Pure Straight-Line Geometric Model
# Canvas: 581 x 481

# 1. Top-Left Stem Block (Pure 4-point polygon with straight lines L)
tl_poly = np.array([[146, 86], [209, 46], [209, 243], [146, 283]], dtype=np.int32)

# 2. Top-Right Stem Block (Pure 4-point polygon with straight lines L)
tr_poly = np.array([[385, 70], [449, 30], [449, 205], [385, 245]], dtype=np.int32)

# 3. Bottom-Left Stem Block (Pure 4-point polygon with straight lines L)
bl_poly = np.array([[146, 335], [209, 295], [209, 397], [146, 435]], dtype=np.int32)

# 4. Bottom-Right Stem Block (Pure 4-point polygon with straight lines L)
br_poly = np.array([[385, 297], [449, 257], [449, 382], [385, 421]], dtype=np.int32)

# 5. Central Diagonal Slash Blade (Sharp polygon extending from far left to far right)
# Point 1: Far-Left tip (24, 396)
# Point 2: (146, 301)
# Point 3: (385, 245)
# Point 4: Far-Right tip (569, 201)
# Point 5: (449, 232)
# Point 6: (209, 325)
# Point 7: (145, 353)
slash_poly = np.array([
    [24, 396],
    [146, 301],
    [385, 245],
    [569, 201],
    [449, 232],
    [209, 325],
    [145, 353]
], dtype=np.int32)

# Render canvas
canvas = np.zeros((481, 581), dtype=np.uint8)
cv2.fillPoly(canvas, [tl_poly, tr_poly, bl_poly, br_poly, slash_poly], 255)

# Load GT
img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
_, gt = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)

intersection = np.logical_and(gt > 0, canvas > 0).sum()
union = np.logical_or(gt > 0, canvas > 0).sum()
iou = intersection / union

print(f"Pure Straight Lines Model IoU: {iou * 100:.2f}%")

artifact_dir = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce'
cv2.imwrite(artifact_dir + r'\pure_straight_preview.png', canvas)
