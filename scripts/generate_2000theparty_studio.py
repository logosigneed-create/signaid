import os, sys
from PIL import Image, ImageFilter
import numpy as np

pub_dir = r'c:\Partage\Projet\Signaid system\public'
models_dir = os.path.join(pub_dir, 'assets', 'models')
out_dir = os.path.join(pub_dir, 'merch', '2000theparty')
os.makedirs(out_dir, exist_ok=True)

# 1. Load active transparent refonte logo
logo_path = os.path.join(pub_dir, 'logo_2000theparty_active.png')
if not os.path.exists(logo_path):
    import urllib.request
    url = 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2Flogo_A_active.png?alt=media&token=a540975a-0398-498b-9c9b-982d813b4fd9'
    urllib.request.urlretrieve(url, logo_path)

logo = Image.open(logo_path).convert('RGBA')
print('Loaded logo:', logo.size, logo.mode)

configs = [
    {
        'name': 'tFront.png',
        'bg': os.path.join(models_dir, 'male_tshirt_front.png'),
        'cx': 0.595, 'cy': 0.41, 'width_ratio': 0.14
    },
    {
        'name': 'tBack.png',
        'bg': os.path.join(models_dir, 'male_tshirt_back.png'),
        'cx': 0.50, 'cy': 0.40, 'width_ratio': 0.30
    },
    {
        'name': 'pFront.png',
        'bg': os.path.join(models_dir, 'male_polo_front.png'),
        'cx': 0.60, 'cy': 0.41, 'width_ratio': 0.13
    },
    {
        'name': 'pBack.png',
        'bg': os.path.join(models_dir, 'male_polo_back.png'),
        'cx': 0.50, 'cy': 0.40, 'width_ratio': 0.30
    },
    {
        'name': 'hFront.png',
        'bg': os.path.join(models_dir, 'male_hoodie_front.png'),
        'cx': 0.595, 'cy': 0.43, 'width_ratio': 0.14
    },
    {
        'name': 'hBack.png',
        'bg': os.path.join(models_dir, 'male_hoodie_back.png'),
        'cx': 0.50, 'cy': 0.46, 'width_ratio': 0.30
    }
]

for cfg in configs:
    bg = Image.open(cfg['bg']).convert('RGBA')
    bw, bh = bg.size
    
    target_w = int(bw * cfg['width_ratio'])
    lw, lh = logo.size
    target_h = int(lh * (target_w / lw))
    
    resized_logo = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Subtle soft shadow for organic textile print realism
    shadow = Image.new('RGBA', resized_logo.size, (0, 0, 0, 0))
    alpha = resized_logo.split()[-1]
    shadow_alpha = alpha.point(lambda p: int(p * 0.3))
    shadow.putalpha(shadow_alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=1.2))
    
    pos_x = int(bw * cfg['cx'] - target_w / 2)
    pos_y = int(bh * cfg['cy'] - target_h / 2)
    
    comp = bg.copy()
    comp.alpha_composite(shadow, (pos_x, pos_y + 1))
    comp.alpha_composite(resized_logo, (pos_x, pos_y))
    
    dest_path = os.path.join(out_dir, cfg['name'])
    comp.save(dest_path, 'PNG', optimize=True)
    print('Generated:', dest_path, comp.size)

print('All 6 studio mockups generated successfully!')
