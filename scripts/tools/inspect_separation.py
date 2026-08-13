import cv2
import numpy as np

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)

# Let's inspect a horizontal slice across the left pillar at y=320, 330, 340, 350, 360
for y in range(300, 380, 5):
    row = img[y, 140:220]
    white_px = np.where(row > 100)[0]
    print(f"y={y}: white pixels in left stem (x=140..220): count={len(white_px)}, min_x={white_px.min()+140 if len(white_px)>0 else 'None'}, max_x={white_px.max()+140 if len(white_px)>0 else 'None'}")
