import os
from PIL import Image, ImageFilter

pub_dir = r'c:\Partage\Projet\Signaid system\public'
vitrine_pub_dir = r'c:\Partage\Projet\02_SIGNAID\Signaid vitrine\public'

logo_front = Image.open(os.path.join(pub_dir, 'logo_clubvision_bee.png')).convert('RGBA')
logo_back = Image.open(os.path.join(pub_dir, 'logo_clubvision_back.png')).convert('RGBA')

configs = [
    {
        'base_name': 'clubvision_tshirt_studio_front',
        'bg': os.path.join(pub_dir, 'assets', 'models', 'male_tshirt_front.png'),
        'logo': logo_front,
        'cx': 0.595, 'cy': 0.41, 'width_ratio': 0.12
    },
    {
        'base_name': 'clubvision_tshirt_studio_back',
        'bg': os.path.join(pub_dir, 'assets', 'models', 'male_tshirt_back.png'),
        'logo': logo_back,
        'cx': 0.50, 'cy': 0.40, 'width_ratio': 0.28
    },
    {
        'base_name': 'clubvision_polo_studio_front',
        'bg': os.path.join(pub_dir, 'assets', 'models', 'male_polo_front.png'),
        'logo': logo_front,
        'cx': 0.60, 'cy': 0.41, 'width_ratio': 0.11
    },
    {
        'base_name': 'clubvision_polo_studio_back',
        'bg': os.path.join(pub_dir, 'assets', 'models', 'male_polo_back.png'),
        'logo': logo_back,
        'cx': 0.50, 'cy': 0.40, 'width_ratio': 0.28
    },
    {
        'base_name': 'clubvision_hoodie_studio_front',
        'bg': os.path.join(pub_dir, 'assets', 'models', 'male_hoodie_front.png'),
        'logo': logo_front,
        'cx': 0.595, 'cy': 0.43, 'width_ratio': 0.12
    },
    {
        'base_name': 'clubvision_hoodie_studio_back',
        'bg': os.path.join(pub_dir, 'assets', 'models', 'male_hoodie_back.png'),
        'logo': logo_back,
        'cx': 0.50, 'cy': 0.46, 'width_ratio': 0.28
    }
]

for cfg in configs:
    bg = Image.open(cfg['bg']).convert('RGBA')
    bw, bh = bg.size
    
    target_w = int(bw * cfg['width_ratio'])
    lw, lh = cfg['logo'].size
    target_h = int(lh * (target_w / lw))
    
    resized_logo = cfg['logo'].resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Subtle soft shadow for organic textile print realism
    shadow = Image.new('RGBA', resized_logo.size, (0, 0, 0, 0))
    alpha = resized_logo.split()[-1]
    shadow_alpha = alpha.point(lambda p: int(p * 0.4))
    shadow.putalpha(shadow_alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=1.5))
    
    pos_x = int(bw * cfg['cx'] - target_w / 2)
    pos_y = int(bh * cfg['cy'] - target_h / 2)
    
    comp = bg.copy()
    comp.alpha_composite(shadow, (pos_x, pos_y + 1))
    comp.alpha_composite(resized_logo, (pos_x, pos_y))
    
    png_name = f"{cfg['base_name']}.png"
    jpg_name = f"{cfg['base_name']}.jpg"
    
    for p_dir in [pub_dir, vitrine_pub_dir]:
        os.makedirs(p_dir, exist_ok=True)
        comp.convert('RGB').save(os.path.join(p_dir, png_name), 'PNG', quality=95)
        comp.convert('RGB').save(os.path.join(p_dir, jpg_name), 'JPEG', quality=90)
    
    print(f"Generated {png_name} and {jpg_name}")

print("All studio images successfully generated in PNG and JPEG formats!")


