import os
from PIL import Image

def main():
    project_public = r"c:\Partage\Projet\signaid-studio\public"
    assets_dir = r"c:\Partage\Projet\signaid-studio\public\assets"
    src_assets = r"c:\Partage\Projet\signaid-studio\src\assets"

    # 1. Source logo file
    source_logo_path = os.path.join(src_assets, "logo-Cf4MRV8L.png")
    print(f"[SOURCE LOGO] Reading original logo from: {source_logo_path}")
    
    orig_logo = Image.open(source_logo_path).convert("RGBA")
    bbox = orig_logo.getbbox()
    print(f"Bounding box: {bbox}")
    
    # Crop to exact non-empty content box
    cropped_logo = orig_logo.crop(bbox)
    
    # Save cropped transparent logo
    cropped_logo_path = os.path.join(project_public, "logo_dfazz_original_cropped.png")
    cropped_logo.save(cropped_logo_path, "PNG")
    print(f"[OK] Saved cropped logo: {cropped_logo_path}")

    # 2. Build Avatar Logo (high contrast container)
    avatar = Image.new("RGBA", (512, 512), (255, 255, 255, 255))
    # Dark navy container inside white circle frame
    bg_box = Image.new("RGBA", (450, 450), (10, 15, 30, 255))
    
    logo_w, logo_h = cropped_logo.size
    ratio = logo_w / logo_h
    
    target_w = 400
    target_h = int(target_w / ratio)
    if target_h > 400:
        target_h = 400
        target_w = int(target_h * ratio)
        
    logo_resized = cropped_logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    bg_box.paste(logo_resized, ((450 - target_w) // 2, (450 - target_h) // 2), logo_resized)
    avatar.paste(bg_box, (31, 31))
    
    avatar_path = os.path.join(project_public, "logo_dfazz_avatar_final.png")
    avatar.save(avatar_path, "PNG")
    print(f"[OK] Saved avatar logo: {avatar_path}")

    # 3. Build Apparel Mockups with exact original logo image
    garments = [
        {
            "name": "tshirt",
            "base_file": os.path.join(assets_dir, "tshirt-black-JHK170.png"),
            "output": os.path.join(project_public, "tshirt_dfazz_original_mockup.png"),
            "scale": 0.32,
            "y_offset": 0.30
        },
        {
            "name": "polo",
            "base_file": os.path.join(assets_dir, "polo-black-JHK510.png"),
            "output": os.path.join(project_public, "polo_dfazz_original_mockup.png"),
            "scale": 0.28,
            "y_offset": 0.35
        },
        {
            "name": "hoodie",
            "base_file": os.path.join(assets_dir, "hoodie-black-JHK421.png"),
            "output": os.path.join(project_public, "hoodie_dfazz_original_mockup.png"),
            "scale": 0.30,
            "y_offset": 0.36
        }
    ]

    for g in garments:
        if not os.path.exists(g['base_file']):
            print(f"[ERROR] Base garment file not found: {g['base_file']}")
            continue
            
        base_img = Image.open(g['base_file']).convert("RGBA")
        chest_logo_w = int(base_img.width * g['scale'])
        chest_logo_h = int(chest_logo_w / ratio)

        logo_chest = cropped_logo.resize((chest_logo_w, chest_logo_h), Image.Resampling.LANCZOS)

        mockup = base_img.copy()
        posX = (base_img.width - chest_logo_w) // 2
        posY = int(base_img.height * g['y_offset'])

        mockup.paste(logo_chest, (posX, posY), logo_chest)
        mockup.save(g['output'], "PNG")
        print(f"[OK] Saved isolated {g['name']} mockup to: {g['output']}")

if __name__ == "__main__":
    main()
