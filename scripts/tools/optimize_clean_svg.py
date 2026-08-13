import cv2
import numpy as np
import scipy.optimize as opt
import re

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape
_, gt = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)

def sample_cubic_bezier(p0, p1, p2, p3, n=50):
    ts = np.linspace(0, 1, n)
    pts = []
    for t in ts:
        pt = (1-t)**3 * np.array(p0) + 3*(1-t)**2 * t * np.array(p1) + 3*(1-t) * t**2 * np.array(p2) + t**3 * np.array(p3)
        pts.append(pt)
    return np.array(pts)

def build_svg_polys(p):
    # p = [u1x, u1y, u2x, u2y, u3x, u3y, u4x, u4y, l1x, l1y, l2x, l2y, l3x, l3y, l4x, l4y]
    u_c1 = [p[0], p[1]]
    u_c2 = [p[2], p[3]]
    u_c3 = [p[4], p[5]]
    u_c4 = [p[6], p[7]]
    
    l_c1 = [p[8], p[9]]
    l_c2 = [p[10], p[11]]
    l_c3 = [p[12], p[13]]
    l_c4 = [p[14], p[15]]

    # Upper Shape:
    # M 449,30 L 386,70 L 385,194 C u1, u2, 209,243 L 209,46 L 147,86 L 146,301 C u3, u4, 569,201 L 449,205 Z
    c_up_inner = sample_cubic_bezier([385, 194], u_c1, u_c2, [209, 243])
    c_up_outer = sample_cubic_bezier([146, 301], u_c3, u_c4, [569, 201])
    
    poly_up = np.vstack([
        [[449, 30]], [[386, 70]], [[385, 194]],
        c_up_inner,
        [[209, 243]], [[209, 46]], [[147, 86]], [[146, 301]],
        c_up_outer,
        [[569, 201]], [[449, 205]]
    ]).astype(np.int32)

    # Lower Shape:
    # M 569,201 C l1, l2, 24,396 L 145,353 L 145,435 L 209,397 L 210,325 C l3, l4, 385,254 L 385,421 L 449,382 L 449,232 Z
    c_dn_outer = sample_cubic_bezier([569, 201], l_c1, l_c2, [24, 396])
    c_dn_inner = sample_cubic_bezier([210, 325], l_c3, l_c4, [385, 254])

    poly_dn = np.vstack([
        [[569, 201]],
        c_dn_outer,
        [[24, 396]], [[145, 353]], [[145, 435]], [[209, 397]], [[210, 325]],
        c_dn_inner,
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
    330.0, 208.0, 260.0, 230.0, # u1, u2
    260.0, 255.0, 420.0, 215.0, # u3, u4
    370.0, 235.0, 170.0, 310.0, # l1, l2
    260.0, 300.0, 330.0, 275.0  # l3, l4
]

res = opt.minimize(loss, init_p, method='Nelder-Mead', options={'maxiter': 1500})
best_p = res.x
best_iou = -res.fun

print(f"Minimal SVG IoU: {best_iou * 100:.2f}%")
print("Optimized Control Points:")
print(f"u_c1={best_p[0]:.1f},{best_p[1]:.1f} u_c2={best_p[2]:.1f},{best_p[3]:.1f}")
print(f"u_c3={best_p[4]:.1f},{best_p[5]:.1f} u_c4={best_p[6]:.1f},{best_p[7]:.1f}")
print(f"l_c1={best_p[8]:.1f},{best_p[9]:.1f} l_c2={best_p[10]:.1f},{best_p[11]:.1f}")
print(f"l_c3={best_p[12]:.1f},{best_p[13]:.1f} l_c4={best_p[14]:.1f},{best_p[15]:.1f}")
