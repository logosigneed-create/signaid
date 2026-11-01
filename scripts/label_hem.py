import cv2
import numpy as np

crop = cv2.imread('temp_inspect/crop_hem_enhanced.png')
# Let's save a series of horizontal lines on crop to see exactly which row is what!
debug = crop.copy()
for y in range(0, 200, 20):
    cv2.line(debug, (0, y), (360, y), (0, 0, 255), 1)
    cv2.putText(debug, f"y={y+850}", (5, y-2 if y>10 else y+12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)

cv2.imwrite('temp_inspect/crop_hem_labeled.png', debug)
print("Saved crop_hem_labeled.png")
