import cv2
import numpy as np

fb = cv2.imread('temp_inspect/heavyFront.png').astype(float)
fw = cv2.imread('temp_inspect/heavyWhiteFront.png').astype(float)

# Regions on the t-shirt avoiding the logo (logo is around x: 560-650, y: 400-500)
# Region 1: Lower torso / abdomen (y: 520 to 880, x: 380 to 720)
# Region 2: Upper chest right of center (avoiding logo) (y: 350 to 500, x: 380 to 540)
# Region 3: Left sleeve (y: 420 to 580, x: 260 to 330)
# Region 4: Right sleeve (y: 420 to 580, x: 740 to 800)

regions = [
    (slice(520, 880), slice(380, 720)),
    (slice(350, 500), slice(380, 540)),
    (slice(420, 580), slice(260, 330)),
    (slice(420, 580), slice(740, 800))
]

pts_b = []
pts_w = []

for r_y, r_x in regions:
    b_crop = fb[r_y, r_x]
    w_crop = fw[r_y, r_x]
    pts_b.append(b_crop.reshape(-1, 3))
    pts_w.append(w_crop.reshape(-1, 3))

pts_b = np.vstack(pts_b)
pts_w = np.vstack(pts_w)

print(f"Total sampled fabric pixels: {len(pts_b)}")

# Let's inspect percentiles of luminance / grayscale
# Using standard BT.601 luma: Y = 0.114*B + 0.587*G + 0.299*R
luma_b = 0.114 * pts_b[:, 0] + 0.587 * pts_b[:, 1] + 0.299 * pts_b[:, 2]
luma_w = 0.114 * pts_w[:, 0] + 0.587 * pts_w[:, 1] + 0.299 * pts_w[:, 2]

percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99]
pb = np.percentile(luma_b, percentiles)
pw = np.percentile(luma_w, percentiles)

print("\nPercentile analysis (Fabric folds & highlights):")
for p, vb, vw in zip(percentiles, pb, pw):
    print(f"  P{p:02d}: Black fabric luma = {vb:5.1f}  -->  White fabric luma = {vw:5.1f}  (Ratio: {vw/max(vb, 1):.2f})")

# Polynomial fits per channel
print("\nPolynomial fit (Degree 1 and 2):")
for c, name in enumerate(['Blue', 'Green', 'Red']):
    p1 = np.polyfit(pts_b[:, c], pts_w[:, c], 1)
    p2 = np.polyfit(pts_b[:, c], pts_w[:, c], 2)
    print(f"[{name}] Linear:  w = {p1[0]:.4f} * b + {p1[1]:.2f}")
    print(f"[{name}] Poly2:   w = {p2[0]:.6f} * b^2 + {p2[1]:.4f} * b + {p2[2]:.2f}")

# Quantile matching / Monotonic spline mapping
# This gives the exact cumulative distribution transfer from black fabric to white fabric!
print("\nQuantile Transfer Function (Deciles):")
quantiles = np.linspace(0.01, 0.99, 50)
q_b = np.quantile(luma_b, quantiles)
q_w = np.quantile(luma_w, quantiles)
for q, b_val, w_val in zip(quantiles[::5], q_b[::5], q_w[::5]):
    print(f"  Quantile {q:.2f}: black={b_val:5.1f} -> white={w_val:5.1f}")
# Filter only fabric pixels where black fabric is in [12, 45] and white fabric in [160, 250]
mask = (luma_b >= 12) & (luma_b <= 45) & (luma_w >= 160) & (luma_w <= 250)
fb_pure = pts_b[mask]
fw_pure = pts_w[mask]

print(f"\nFiltered pure fabric pixels: {len(fb_pure)}")
luma_b_p = luma_b[mask]
luma_w_p = luma_w[mask]

print("\nPure Fabric Percentiles:")
for p in [5, 10, 25, 50, 75, 90, 95]:
    vb = np.percentile(luma_b_p, p)
    vw = np.percentile(luma_w_p, p)
    print(f"  P{p:02d}: Black = {vb:5.1f}  -->  White = {vw:5.1f}")

print("\nPure Fabric Linear Fit per channel:")
for c, name in enumerate(['Blue', 'Green', 'Red']):
    p1 = np.polyfit(fb_pure[:, c], fw_pure[:, c], 1)
    p2 = np.polyfit(fb_pure[:, c], fw_pure[:, c], 2)
    print(f"[{name}] Linear:  w = {p1[0]:.4f} * b + {p1[1]:.2f}")
    print(f"[{name}] Poly2:   w = {p2[0]:.6f} * b^2 + {p2[1]:.4f} * b + {p2[2]:.2f}")



