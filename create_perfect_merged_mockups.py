import os
from PIL import Image, ImageEnhance

def main():
    project_public = r"c:\Partage\Projet\signaid-studio\public"
    assets_dir = r"c:\Partage\Projet\signaid-studio\public\assets"
    src_assets = r"c:\Partage\Projet\signaid-studio\src\assets"

    # 1. Load source logo
    source_logo_path = os.path.join(src_assets, "logo-Cf4MRV8L.png")
    orig_logo = Image.open(source_logo_path).convert("RGBA")
    bbox = orig_logo.getbbox()
    cropped_logo = orig_logo.crop(bbox)

    # 2. Make pure solid white logo with opacity boost
    r, g, b, alpha = cropped_logo.split()
    # Create pure white RGB
    white_rgb = Image.new("RGB", cropped_logo.size, (255, 255, 255))
    # Binarize alpha to ensure crisp solid white lines (threshold alpha > 20)
    alpha_solid = alpha.point(lambda p: 255 if p > 30 else 0)
    
    logo_white = Image.merge("RGBA", (white_rgb.split()[0], white_rgb.split()[1], white_rgb.split()[2], alpha_solid))

    logo_white_path = os.path.join(project_public, "logo_dfazz_white_perfect.png")
    logo_white.save(logo_white_path, "PNG")
    print(f"[OK] Saved pure solid white logo to: {logo_white_path}")

    # 3. Build & Verify Apparel Renders
    garments = [
        {
            "name": "tshirt",
            "base_file": os.path.join(assets_dir, "tshirt-black-JHK170.png"),
            "output": os.path.join(project_public, "tshirt_dfazz_merged_perfect.png"),
            "scale": 0.36,
            "y_offset": 0.28
        },
        {
            "name": "polo",
            "base_file": os.path.join(assets_dir, "polo-black-JHK510.png"),
            "output": os.path.join(project_public, "polo_dfazz_merged_perfect.png"),
            "scale": 0.32,
            "y_offset": 0.32
        },
        {
            "name": "hoodie",
            "base_file": os.path.join(assets_dir, "hoodie-black-JHK421.png"),
            "output": os.path.join(project_public, "hoodie_dfazz_merged_perfect.png"),
            "scale": 0.35,
            "y_offset": 0.34
        }
    ]

    logo_w, logo_h = logo_white.size
    ratio = logo_w / logo_h

    for g in garments:
        if not os.path.exists(g['base_file']):
            print(f"[ERROR] Base garment file not found: {g['base_file']}")
            continue

        base_img = Image.open(g['base_file']).convert("RGBA")
        chest_logo_w = int(base_img.width * g['scale'])
        chest_logo_h = int(chest_logo_w / ratio)

        logo_chest = logo_white.resize((chest_logo_w, chest_logo_h), Image.Resampling.LANCZOS)

        mockup = base_img.copy()
        posX = (base_img.width - chest_logo_w) // 2
        posY = int(base_img.height * g['y_offset'])

        # Composite logo using alpha channel as mask
        mockup.alpha_composite(logo_chest, (posX, posY))

        # Verification check: count bright white pixels in the chest area
        chest_crop = mockup.crop((posX, posY, posX + chest_logo_w, posY + chest_logo_h))
        white_pixel_count = 0
        for p in chest_crop.getdata():
            if p[0] > 200 and p[1] > 200 and p[2] > 200 and p[3] > 200:
                white_pixel_count += 1

        print(f"[VERIFY] {g['name']} chest area has {white_pixel_count} solid white logo pixels.")
        if white_pixel_count < 100:
            raise Exception(f"Failed verification: {g['name']} logo was not rendered properly!")

        mockup.save(g['output'], "PNG")
        print(f"[OK] Saved verified {g['name']} mockup to: {g['output']}")

if __name__ == "__main__":
    main()
