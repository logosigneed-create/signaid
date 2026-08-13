import cv2
import numpy as np

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path)
h, w, c = img.shape
print(f"Image dimensions: {w}x{h}")

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
_, thresh = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY)

# Find contours
contours, hierarchy = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

print(f"Found {len(contours)} external contours:")

contour_list = []
for i, cnt in enumerate(contours):
    area = cv2.contourArea(cnt)
    if area < 50:
        continue
    
    # Epsilon = 0.008 for precision
    epsilon = 0.008 * cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, epsilon, True)
    
    pts = [{'x': int(pt[0][0]), 'y': int(pt[0][1])} for pt in approx]
    print(f"\nContour {i}: Area={area:.1f}, Points={len(pts)}")
    for p_idx, p in enumerate(pts):
        print(f"   Pt {p_idx}: ({p['x']}, {p['y']})")
    contour_list.append(pts)
