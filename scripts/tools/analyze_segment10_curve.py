import cv2
import numpy as np

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape
_, thresh = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)

# Segment 10: from (23, 396) to (145, 353)
pA = (23, 396)
pB = (145, 353)

print(f"Analyzing Segment 10 from {pA} to {pB}...")

# Sample along segment and check curvature
ts = np.linspace(0, 1, 20)
offsets = []
dx = pB[0] - pA[0]
dy = pB[1] - pA[1]
length = np.hypot(dx, dy)
nx = -dy / length
ny = dx / length

for t in ts:
    px = pA[0] * (1-t) + pB[0] * t
    py = pA[1] * (1-t) + pB[1] * t
    best_off = 0
    for off in range(-20, 20):
        sx = int(px + off * nx)
        sy = int(py + off * ny)
        if 0 <= sx < w and 0 <= sy < h:
            if thresh[sy, sx] > 0:
                if abs(off) > abs(best_off):
                    best_off = off
    offsets.append(best_off)

print("Curvature offsets along Segment 10:", offsets)

# Optimal Bezier handles for Segment 10:
# From (23, 396) to (145, 353) with smooth arch curve C!
c1x = int(pA[0] + dx * 0.33 + nx * (-12))
c1y = int(pA[1] + dy * 0.33 + ny * (-12))
c2x = int(pA[0] + dx * 0.66 + nx * (-12))
c2y = int(pA[1] + dy * 0.66 + ny * (-12))

print(f"Optimal Bezier Handles for Segment 10: C {c1x},{c1y} {c2x},{c2y} {pB[0]},{pB[1]}")
