import cv2
import numpy as np

crop = cv2.imread('temp_inspect/crop_neck_enhanced.png')
# crop_neck was b[240:350, 350:610]
# Original y = y_crop + 240, original x = x_crop + 350
debug = crop.copy()
for y in range(0, crop.shape[0], 10):
    cv2.line(debug, (0, y), (crop.shape[1], y), (0, 0, 255), 1)
    cv2.putText(debug, f"y={y+240}", (5, y-2 if y>10 else y+10), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)

cv2.imwrite('temp_inspect/crop_neck_labeled.png', debug)
print("Saved crop_neck_labeled.png")
