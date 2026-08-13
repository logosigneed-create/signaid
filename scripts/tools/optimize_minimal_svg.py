import cv2
import numpy as np
import scipy.optimize as opt
import re

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape
_, gt = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)

# Upper Shape minimal vertices:
# P1: (449, 30), P2: (386, 70), P3: (385, 194), P4: (209, 243), P5: (209, 46), P6: (147, 86), P7: (146, 289), P8: (569, 201), P9: (449, 204)

# Lower Shape minimal vertices:
# Q1: (24, 396), Q2: (145, 353), Q3: (145, 435), Q4: (209, 397), Q5: (210, 325), Q6: (385, 254), Q7: (385, 421), Q8: (449, 382), Q9: (449, 232)

def sample_cubic_bezier(p0, p1, p2, p3, n=50):
    ts = np.linspace(0, 1, n)
    pts = []
    for t in ts:
        pt = (1-t)**3 * np.array(p0) + 3*(1-t)**2 * t * np.array(p1) + 3*(1-t) * t**2 * np.array(p2) + t**3 * np.array(p3)
        pts.append(pt)
    return np.array(pts)

def build_shape_mask(upper_params, lower_params):
    # upper_params: [u_c1x, u_c1y, u_c2x, u_c2y] for curve P7->P8
    # lower_params: [l_c1x, l_c1y, l_c2x, l_c2y] for curve Q9->Q1
    canvas = np.zeros((h, w), dtype=np.uint8)
    
    # Upper shape
    P1 = [449, 30]
    P2 = [386, 70]
    P3 = [385, 194]
    P4 = [209, 243]
    P5 = [209, 46]
    P6 = [147, 86]
    P7 = [146, 289]
    P8 = [569, 201]
    P9 = [449, 204]
    
    # Curve P3 -> P4
    curve_p3_p4 = sample_cubic_bezier(P3, [297, 218], [297, 218], P4)
    # Curve P7 -> P8
    curve_p7_p8 = sample_cubic_bezier(P7, [upper_params[0], upper_params[1]], [upper_params[2], upper_params[3]], P8)
    
    poly_up = np.vstack([
        [P1], [P2], [P3],
        curve_p3_p4,
        [P4], [P5], [P6], [P7],
        curve_p7_p8,
        [P8], [P9]
    ]).astype(np.int32)
    
    # Lower shape
    Q1 = [24, 396]
    Q2 = [145, 353]
    Q3 = [145, 435]
    Q4 = [209, 397]
    Q5 = [210, 325]
    Q6 = [385, 254]
    Q7 = [385, 421]
    Q8 = [449, 382]
    Q9 = [449, 232]
    
    # Curve Q5 -> Q6
    curve_q5_q6 = sample_cubic_bezier(Q5, [297, 265], [297, 265], Q6)
    # Curve Q9 -> Q1
    curve_q9_q1 = sample_cubic_bezier(Q9, [lower_params[0], lower_params[1]], [lower_params[2], lower_params[3]], Q1)
    
    poly_dn = np.vstack([
        [Q1], [Q2], [Q3], [Q4], [Q5],
        curve_q5_q6,
        [Q6], [Q7], [Q8], [Q9],
        curve_q9_q1
    ]).astype(np.int32)
    
    cv2.fillPoly(canvas, [poly_up], 255)
    cv2.fillPoly(canvas, [poly_dn], 255)
    return canvas

def objective(params):
    canvas = build_shape_mask(params[:4], params[4:])
    intersection = np.logical_and(gt > 0, canvas > 0).sum()
    union = np.logical_or(gt > 0, canvas > 0).sum()
    return - (intersection / union)

init_params = [
    280.0, 250.0, 420.0, 215.0, # upper curve C1, C2
    300.0, 275.0, 150.0, 330.0  # lower curve C1, C2
]

res = opt.minimize(objective, init_params, method='Nelder-Mead', options={'maxiter': 500})
best_params = res.x
best_iou = -res.fun

print(f"Minimal SVG IoU: {best_iou * 100:.2f}%")
print("Best Curve Control Points:", best_params)
