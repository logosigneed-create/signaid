#!/usr/bin/env python3
"""
generate_nx7200_white_hd.py
----------------------------
High-Definition Anti-Aliased Cutout Pipeline for NX7200 White T-Shirt.
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, gaussian_filter1d
from skimage.transform import PiecewiseAffineTransform, warp


def generate_refined_mask(ref_alpha_channel, choke_px=1, feather_sigma=1.2, contour_sigma=3.0, supersample_scale=4):
    """Generate anti-aliased alpha mask from reference template alpha channel."""
    ref_arr = np.array(ref_alpha_channel)
    h, w = ref_arr.shape
    _, binary = cv2.threshold(ref_arr, 128, 255, cv2.THRESH_BINARY)
    
    # Extract outer silhouette contour
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cnt = max(contours, key=cv2.contourArea)
    cnt_pts = cnt.squeeze().astype(float)
    
    # Sub-pixel smoothing along contour perimeter to eliminate staircase steps
    smoothed = np.zeros_like(cnt_pts)
    smoothed[:, 0] = gaussian_filter1d(cnt_pts[:, 0], sigma=contour_sigma, mode='wrap')
    smoothed[:, 1] = gaussian_filter1d(cnt_pts[:, 1], sigma=contour_sigma, mode='wrap')
    
    # Render polygon onto supersampled canvas
    smoothed_scaled = np.round(smoothed * supersample_scale).astype(np.int32)
    mask_hr = np.zeros((h * supersample_scale, w * supersample_scale), dtype=np.uint8)
    cv2.fillPoly(mask_hr, [smoothed_scaled], 255)
    
    # Downsample back to 1024x1024 with area averaging
    mask_aa = cv2.resize(mask_hr, (w, h), interpolation=cv2.INTER_AREA)
    
    # 1 px morphological choke (erosion)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask_choked = cv2.erode(mask_aa, kernel, iterations=choke_px)
    
    # Feathering on alpha channel only (1.2 px Gaussian blur for micro-duvet)
    mask_feathered = cv2.GaussianBlur(mask_choked, (0, 0), sigmaX=feather_sigma, sigmaY=feather_sigma)
    
    # Preserve solid interior
    core = cv2.erode(binary, kernel, iterations=4)
    mask_final = np.where(core == 255, 255, mask_feathered)
    return mask_final.astype(np.uint8)


def main():
    src_path = r'C:\Users\Asus\Downloads\2574824.jpg'
    ref_front_path = 'public/assets/tshirt-black-NX7200.png'
    ref_back_path = 'public/assets/tshirt-black-NX7200-dos.png'
    
    dest_dirs = [
        'public/assets',
        'public/imported_products/VETEMENTS/tshirt/NX7200'
    ]
    
    print(f"Loading source: {src_path}")
    src = Image.open(src_path).convert('RGB')
    src_arr = np.array(src)
    
    # Step 1: Pre-process source to prevent white background bleed
    print("Pre-processing source image: fabric segmentation & color bleeding...")
    diff = 255 - src_arr
    is_fabric = (np.max(diff, axis=2) > 4).astype(np.uint8) * 255
    inpainted_src = cv2.inpaint(src_arr, 255 - is_fabric, 10, cv2.INPAINT_TELEA)
    
    # Step 2: Piecewise Affine Warping & Landmark Registration to NX7200 template
    print("Registering landmarks to 1024x1024 NX7200 template...")
    src_pts = np.array([
        [0, 0], [210, 0], [420, 0],
        [160, 28], [210, 74], [260, 28],
        [111, 63], [309, 62],
        [12, 224], [408, 223],
        [92, 260], [328, 260],
        [95, 380], [325, 380],
        [101, 508], [210, 516], [313, 508],
        [0, 540], [210, 540], [420, 540],
        [0, 260], [420, 260]
    ], dtype=float)

    dst_pts = np.array([
        [0, 0], [512, 0], [1024, 0],
        [395, 10], [512, 30], [629, 10],
        [285, 53], [737, 53],
        [60, 515], [963, 516],
        [254, 650], [770, 650],
        [254, 820], [770, 820],
        [253, 1004], [512, 1014], [770, 1004],
        [0, 1024], [512, 1024], [1024, 1024],
        [0, 650], [1024, 650]
    ], dtype=float)

    tform = PiecewiseAffineTransform.from_estimate(dst_pts, src_pts)
    warped = warp(inpainted_src / 255.0, tform, output_shape=(1024, 1024), order=3)
    warped_front_rgb = (np.clip(warped, 0, 1) * 255).astype(np.uint8)
    warped_front_rgb[1015:, :] = warped_front_rgb[1014:1015, :]

    # Step 3: Generate refined anti-aliased front alpha mask
    print("Generating refined anti-aliased FRONT mask...")
    ref_front = Image.open(ref_front_path)
    front_mask = generate_refined_mask(ref_front.split()[-1], choke_px=1, feather_sigma=1.2, contour_sigma=3.0)
    
    # Outward nearest-neighbor color bleeding from core mask (alpha==255)
    print("Applying straight-alpha color bleeding for front edge...")
    core_front = front_mask == 255
    indices_front = distance_transform_edt(~core_front, return_distances=False, return_indices=True)
    bled_front_rgb = warped_front_rgb[indices_front[0], indices_front[1]]
    
    front_rgba = np.zeros((1024, 1024, 4), dtype=np.uint8)
    front_rgba[:, :, :3] = bled_front_rgb
    front_rgba[:, :, 3] = front_mask
    final_front_img = Image.fromarray(front_rgba, 'RGBA')

    # Step 4: Generate Back (Dos) view
    print("Generating refined anti-aliased BACK (Dos) mask and texture...")
    ref_back = Image.open(ref_back_path)
    back_mask = generate_refined_mask(ref_back.split()[-1], choke_px=1, feather_sigma=1.2, contour_sigma=3.0)
    
    back_rgb = np.fliplr(warped_front_rgb)
    tag_mask = np.zeros((1024, 1024), dtype=np.uint8)
    cv2.ellipse(tag_mask, (512, 35), (90, 25), 0, 0, 360, 255, -1)
    back_rgb_clean = cv2.inpaint(back_rgb, tag_mask, 15, cv2.INPAINT_TELEA)
    
    collar_band = np.zeros((1024, 1024), dtype=np.uint8)
    for x in range(410, 615):
        ys = np.where(back_mask[:, x] > 50)[0]
        if len(ys) > 0:
            collar_band[ys.min():ys.min()+12, x] = 255
            
    collar_shaded = cv2.GaussianBlur(collar_band.astype(float), (0, 0), sigmaX=2.0, sigmaY=2.0) / 255.0
    for c in range(3):
        back_rgb_clean[:, :, c] = np.clip(
            back_rgb_clean[:, :, c].astype(float) - collar_shaded * 12.0,
            0, 255
        ).astype(np.uint8)
        
    print("Applying straight-alpha color bleeding for back edge...")
    core_back = back_mask == 255
    indices_back = distance_transform_edt(~core_back, return_distances=False, return_indices=True)
    bled_back_rgb = back_rgb_clean[indices_back[0], indices_back[1]]
    
    back_rgba = np.zeros((1024, 1024, 4), dtype=np.uint8)
    back_rgba[:, :, :3] = bled_back_rgb
    back_rgba[:, :, 3] = back_mask
    final_back_img = Image.fromarray(back_rgba, 'RGBA')

    # Step 5: Audit edge quality
    print("\n--- Edge Quality Audit ---")
    for label, rgba_arr in [('Front', front_rgba), ('Back', back_rgba)]:
        a = rgba_arr[:, :, 3]
        rgb = rgba_arr[:, :, :3]
        edge_pts = (a > 0) & (a < 255)
        edge_rgb_pts = rgb[edge_pts]
        n_edge = np.sum(edge_pts)
        pure_black = np.sum(np.all(edge_rgb_pts == 0, axis=1))
        pure_white = np.sum(np.all(edge_rgb_pts == 255, axis=1))
        mean_edge = edge_rgb_pts.mean(axis=0)
        print(f"[{label}] Transition pixels: {n_edge}")
        print(f"[{label}] Mean Edge RGB: {mean_edge.round(2)}")
        print(f"[{label}] Pure black edge pixels: {pure_black}")
        print(f"[{label}] Pure white edge pixels: {pure_white}")
        assert pure_black == 0, f"{label} has dark halo pixels!"
        assert pure_white == 0, f"{label} has white background leak pixels!"
    print("--- Edge Audit PASSED (100% clean) ---\n")

    # Step 6: Deploy files
    for d in dest_dirs:
        os.makedirs(d, exist_ok=True)
        f_path = os.path.join(d, 'tshirt-white-NX7200.png')
        b_path = os.path.join(d, 'tshirt-white-NX7200-dos.png')
        final_front_img.save(f_path, 'PNG', optimize=True)
        final_back_img.save(b_path, 'PNG', optimize=True)
        print(f"Deployed: {f_path} ({os.path.getsize(f_path)} bytes)")
        print(f"Deployed: {b_path} ({os.path.getsize(b_path)} bytes)")

    print("\nAll assets successfully generated and deployed!")


if __name__ == '__main__':
    main()

