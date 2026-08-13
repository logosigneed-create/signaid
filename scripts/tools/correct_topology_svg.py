import cv2
import numpy as np
import scipy.optimize as opt

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape
_, gt = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)

def sample_cubic_bezier(p0, p1, p2, p3, n=40):
    ts = np.linspace(0, 1, n)
    pts = []
    for t in ts:
        pt = (1-t)**3 * np.array(p0) + 3*(1-t)**2 * t * np.array(p1) + 3*(1-t) * t**2 * np.array(p2) + t**3 * np.array(p3)
        pts.append(pt)
    return np.array(pts)

def build_svg_polys(p):
    # p = [u_in1x, u_in1y, u_in2x, u_in2y, u_out1x, u_out1y, u_out2x, u_out2y,
    #      l_blade1x, l_blade1y, l_blade2x, l_blade2y, l_in1x, l_in1y, l_in2x, l_in2y]

    # Component 1 (Upper Shape):
    # M 449,30 L 386,70 L 385,194 C u_in 209,243 L 209,46 L 147,86 L 146,301 C u_out 449,205 Z
    c_u_in = sample_cubic_bezier([385, 194], [p[0], p[1]], [p[2], p[3]], [209, 243])
    c_u_out = sample_cubic_bezier([146, 301], [p[4], p[5]], [p[6], p[7]], [449, 205])

    poly_up = np.vstack([
        [[449, 30]], [[386, 70]], [[385, 194]],
        c_u_in,
        [[209, 243]], [[209, 46]], [[147, 86]], [[146, 301]],
        c_u_out,
        [[449, 205]]
    ]).astype(np.int32)

    # Component 2 (Lower Shape + Blade):
    # M 569,201 C l_blade 24,396 L 145,353 L 147,435 L 209,397 L 210,325 C l_in 385,254 L 385,421 L 449,382 L 449,232 Z
    c_l_blade = sample_cubic_bezier([569, 201], [p[8], p[9]], [p[10], p[11]], [24, 396])
    c_l_in = sample_cubic_bezier([210, 325], [p[12], p[13]], [p[14], p[15]], [385, 254])

    poly_dn = np.vstack([
        [[569, 201]],
        c_l_blade,
        [[24, 396]], [[145, 353]], [[147, 435]], [[209, 397]], [[210, 325]],
        c_l_in,
        [[385, 254]], [[385, 421]], [[449, 382]], [[449, 232]]
    ]).astype(np.int32)

    return poly_up, poly_dn

def loss(p):
    poly_up, poly_dn = build_svg_polys(p)
    canvas = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(canvas, [poly_up], 255)
    cv2.fillPoly(canvas, [poly_dn], 255)
    
    intersection = np.logical_and(gt > 0, canvas > 0).sum()
    union = np.logical_or(gt > 0, canvas > 0).sum()
    return - (intersection / union)

init_p = [
    330.0, 208.0, 260.0, 230.0, # u_in
    220.0, 270.0, 380.0, 220.0, # u_out
    350.0, 235.0, 150.0, 310.0, # l_blade
    260.0, 300.0, 330.0, 275.0  # l_in
]

res = opt.minimize(loss, init_p, method='Nelder-Mead', options={'maxiter': 2000})
best_p = res.x
best_iou = -res.fun

print(f"Corrected Minimal SVG IoU: {best_iou * 100:.2f}%")
print("Optimized Control Points:")
print(f"u_in: C1=({best_p[0]:.1f}, {best_p[1]:.1f}), C2=({best_p[2]:.1f}, {best_p[3]:.1f})")
print(f"u_out: C1=({best_p[4]:.1f}, {best_p[5]:.1f}), C2=({best_p[6]:.1f}, {best_p[7]:.1f})")
print(f"l_blade: C1=({best_p[8]:.1f}, {best_p[9]:.1f}), C2=({best_p[10]:.1f}, {best_p[11]:.1f})")
print(f"l_in: C1=({best_p[12]:.1f}, {best_p[13]:.1f}), C2=({best_p[14]:.1f}, {best_p[15]:.1f})")
