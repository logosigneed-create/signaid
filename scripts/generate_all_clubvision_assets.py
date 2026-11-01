import os
import cv2
import numpy as np
from PIL import Image

os.makedirs('temp_inspect/generated', exist_ok=True)

# 1. FRONT SLOTS (x=0.64, y=0.34, scale=0.17) avec Logo B (abeille seule)
logoB_path = 'temp_inspect/logoB.png'
logoB = Image.open(logoB_path).convert('RGBA')

logoB_black_arr = np.array(logoB)
logoB_black_arr[:, :, :3] = 0
logoB_black = Image.fromarray(logoB_black_arr, 'RGBA')

front_slots = [
    ('tFront_fixed.png', 'public/assets/tshirt-black-JHK170.png', logoB),
    ('pFront_fixed.png', 'public/assets/polo-black-JHK510.png', logoB),
    ('hFront_fixed.png', 'public/assets/hoodie-black-JHK421.png', logoB),
    ('heavyFront_fixed.png', 'public/assets/tshirt-black-NX7200.png', logoB),
    ('heavyWhiteFront_fixed.png', 'public/assets/tshirt-white-NX7200.png', logoB_black)
]

for filename, base_path, logo_img in front_slots:
    base = Image.open(base_path).convert('RGBA')
    W, H = base.size
    
    logo_w = int(W * 0.17)
    logo_ratio = logo_img.width / logo_img.height
    logo_h = int(logo_w / logo_ratio)
    
    resized_logo = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    
    pos_x = int(W * 0.64) - (logo_w // 2)
    pos_y = int(H * 0.34) - (logo_h // 2)
    
    composed = base.copy()
    composed.paste(resized_logo, (pos_x, pos_y), resized_logo)
    
    out_path = os.path.join('temp_inspect/generated', filename)
    composed.save(out_path, 'PNG', optimize=True)
    print(f'✅ [Généré] {out_path}: {composed.size}, logo box: left={pos_x}, top={pos_y}, w={logo_w}, h={logo_h}')

# 2. HEAVYWEIGHT WHITE BACK (Streetwear 1088x960 avec Logo A HD complet)
hb = cv2.imread('temp_inspect/heavyBack.png') # (1088, 960, 3)
h, w, c = hb.shape

# Inpaint ancien logo central
logo_zone_mask = np.zeros((h, w), dtype=np.uint8)
central_patch = hb[360:640, 320:640]
old_logo_pixels = np.mean(central_patch, axis=2) > 70
logo_zone_mask[360:640, 320:640][old_logo_pixels] = 255
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
logo_zone_mask = cv2.dilate(logo_zone_mask, kernel, iterations=2)
hb_clean = cv2.inpaint(hb, logo_zone_mask, 7, cv2.INPAINT_TELEA)

# Masque de segmentation textile
gray = cv2.cvtColor(hb, cv2.COLOR_BGR2GRAY)
is_bg = gray > 165
is_skin = (hb[:, :, 2] > 140) & (hb[:, :, 0] < 140) & (hb[:, :, 2] > hb[:, :, 0] + 30)
skin_mask = cv2.dilate(is_skin.astype(np.uint8), kernel, iterations=2)

shirt_mask = np.zeros((h, w), dtype=np.uint8)
for y in range(260, 882):
    for x in range(160, 800):
        if is_bg[y, x] or skin_mask[y, x]:
            continue
        if y < 284 and (x >= 415 and x <= 545):
            continue
        if y >= 600 and (x < 255 or x > 710) and is_skin[y, x]:
            continue
        shirt_mask[y, x] = 255

shirt_mask = cv2.morphologyEx(shirt_mask, cv2.MORPH_CLOSE, kernel, iterations=3)
contours, _ = cv2.findContours(shirt_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
shirt_mask_clean = np.zeros_like(shirt_mask)
for cnt in contours:
    if cv2.contourArea(cnt) > 50000:
        cv2.drawContours(shirt_mask_clean, [cnt], -1, 255, -1)

feathered_alpha = cv2.GaussianBlur(shirt_mask_clean.astype(float) / 255.0, (0, 0), sigmaX=1.5, sigmaY=1.5)

# Transfert photométrique tissu noir vers tissu blanc
white_fabric = hb_clean.astype(float).copy()
white_fabric[:, :, 0] = np.clip(2.0436 * white_fabric[:, :, 0] + 176.19, 0, 255)
white_fabric[:, :, 1] = np.clip(2.0091 * white_fabric[:, :, 1] + 176.40, 0, 255)
white_fabric[:, :, 2] = np.clip(1.9160 * white_fabric[:, :, 2] + 178.16, 0, 255)

recolored = hb_clean.astype(float).copy()
for c in range(3):
    recolored[:, :, c] = recolored[:, :, c] * (1.0 - feathered_alpha) + white_fabric[:, :, c] * feathered_alpha
recolored = np.clip(recolored, 0, 255).astype(np.uint8)

# Logo A HD complet (abeille + typographie complète "CLUB VISION ROOM")
logoA = Image.open('temp_inspect/logoA.png').convert('RGBA')
logoA_black_arr = np.array(logoA)
logoA_black_arr[:, :, :3] = 0
logoA_black = Image.fromarray(logoA_black_arr, 'RGBA')

logo_w = 285
logo_ratio = logoA.width / logoA.height
logo_h = int(logo_w / logo_ratio)
logoA_resized = logoA_black.resize((logo_w, logo_h), Image.Resampling.LANCZOS)

pos_x = (w // 2) - (logo_w // 2)
pos_y = 485 - (logo_h // 2)

final_img = Image.fromarray(cv2.cvtColor(recolored, cv2.COLOR_BGR2RGB))
final_img.paste(logoA_resized, (pos_x, pos_y), logoA_resized)

out_path = 'temp_inspect/generated/heavyWhiteBack.png'
final_img.save(out_path, 'PNG', optimize=True)
print(f'✅ [Généré] {out_path}: {final_img.size}, logo box: left={pos_x}, top={pos_y}, w={logo_w}, h={logo_h}')
