import cv2
import numpy as np

fb = cv2.imread('temp_inspect/heavyFront.png')
fw = cv2.imread('temp_inspect/heavyWhiteFront.png')

print("fb shape:", fb.shape)
print("fw shape:", fw.shape)

# Let's find feature points or template match the face:
# Face in fb:
face_b = fb[80:250, 450:570]
res = cv2.matchTemplate(fw, face_b, cv2.TM_CCOEFF_NORMED)
min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
print(f"Template match face max_val: {max_val}, loc: {max_loc}, expected (450, 80)")
