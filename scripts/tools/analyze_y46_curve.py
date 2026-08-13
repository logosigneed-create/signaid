import cv2
import numpy as np

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape
_, thresh = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)

# Inspect around (209, 46) and (147, 86) and (385, 194) -> (209, 243)
print("Analyzing raster contour around Y = 46 px...")

# Check segment between (209, 46) and (147, 86)
pA = (209, 46)
pB = (147, 86)

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
    for off in range(-50, 50):
        sx = int(px + off * nx)
        sy = int(py + off * ny)
        if 0 <= sx < w and 0 <= sy < h:
            if thresh[sy, sx] > 0:
                if abs(off) > abs(best_off):
                    best_off = off
    offsets.append(best_off)

print("Segment (209,46) -> (147,86) offsets:", offsets)

# Check segment between (147, 86) and (146, 301)
pA2 = (147, 86)
pB2 = (146, 301)
dx2 = pB2[0] - pA2[0]
dy2 = pB2[1] - pA2[1]
length2 = np.hypot(dx2, dy2)
nx2 = -dy2 / length2
ny2 = dx2 / length2

offsets2 = []
for t in ts:
    px = pA2[0] * (1-t) + pB2[0] * t
    py = pA2[1] * (1-t) + pB2[1] * t
    best_off = 0
    for off in range(-50, 50):
        sx = int(px + off * nx2)
        sy = int(py + off * ny2)
        if 0 <= sx < w and 0 <= sy < h:
            if thresh[sy, sx] > 0:
                if abs(off) > abs(best_off):
                    best_off = off
    offsets2.append(best_off)

print("Segment (147,86) -> (146,301) offsets:", offsets2)
