import cv2
import numpy as np

wb = cv2.imread('temp_inspect/heavyWhiteBack.png')
bb = cv2.imread('temp_inspect/heavyBack.png')

print("White back shape:", wb.shape)
print("Black back shape:", bb.shape)

# Let's check diff on background (e.g. y 50-100, x 50-100)
diff_bg = np.abs(wb[50:100, 50:100].astype(float) - bb[50:100, 50:100].astype(float))
print("Mean bg diff:", np.mean(diff_bg), "Max bg diff:", np.max(diff_bg))

# Let's check pants (y 950-1000, x 450-550)
diff_pants = np.abs(wb[950:1000, 450:550].astype(float) - bb[950:1000, 450:550].astype(float))
print("Mean pants diff:", np.mean(diff_pants), "Max pants diff:", np.max(diff_pants))

# Let's check head/hair (y 50-200, x 450-550)
diff_head = np.abs(wb[50:200, 450:550].astype(float) - bb[50:200, 450:550].astype(float))
print("Mean head diff:", np.mean(diff_head), "Max head diff:", np.max(diff_head))
