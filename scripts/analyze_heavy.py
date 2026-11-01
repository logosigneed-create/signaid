import cv2
import numpy as np

f_w = cv2.imread('temp_inspect/heavyWhiteFront.png', 0).astype(float)
f_b = cv2.imread('temp_inspect/heavyFront.png', 0).astype(float)
crop_w = f_w[350:550, 350:550]
crop_b = f_b[350:550, 350:550]

hp_w = crop_w - cv2.GaussianBlur(crop_w, (15, 15), 0)
hp_b = crop_b - cv2.GaussianBlur(crop_b, (15, 15), 0)
print('HP correlation:', np.corrcoef(hp_w.flatten(), hp_b.flatten())[0, 1])

# Check edges difference
diff = np.abs(f_w - f_b)
print('Diff on face (y 100-250, x 400-600):', np.max(diff[100:250, 400:600]))
print('Diff on arms (y 600-800, x 250-320):', np.max(diff[600:800, 250:320]))
print('Diff on pants (y 950-1000, x 450-550):', np.max(diff[950:1000, 450:550]))
print('Diff on background (y 50-100, x 50-100):', np.max(diff[50:100, 50:100]))

