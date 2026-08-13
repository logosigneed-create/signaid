import cv2
import numpy as np

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)

# Threshold at 120
_, thresh = cv2.threshold(img, 120, 255, cv2.THRESH_BINARY)

# Find connected components
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh)

print(f"Connected components count: {num_labels - 1}")
for i in range(1, num_labels):
    mask = (labels == i).astype(np.uint8) * 255
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cnt = cnts[0]
    approx = cv2.approxPolyDP(cnt, 2.0, True)
    print(f"Component {i} (area={stats[i, cv2.CC_STAT_AREA]}): {len(approx)} points")
    for pt in approx:
        print(f"  {pt[0].tolist()}")
