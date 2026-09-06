import os
from PIL import Image

def main():
    project_public = r"c:\Partage\Projet\signaid-studio\public"
    assets_dir = r"c:\Partage\Projet\signaid-studio\public\assets"
    src_assets = r"c:\Partage\Projet\signaid-studio\src\assets"

    # 1. Load source logo
    source_logo_path = os.path.join(src_assets, "logo-Cf4MRV8L.png")
    orig_logo = Image.open(source_logo_path).convert("RGBA")
    bbox = orig_logo.getbbox()
    cropped_logo = orig_logo.crop(bbox)

    # 2. Make logo pure white (logo_dfazz_white.png)
    # Extract alpha channel and create pure white logo with original alpha mask
    r, g, b, alpha = cropped_logo.split()
    white_img = Image.new("RGB", cropped_logo.size, (255, 255, 255))
    logo_white = Image.merge("RGBA", (white_img.split()[0], white_img.split()[1], white_img.split()[2], alpha))

    logo_white_path = os.path.join(project_public, "logo_dfazz_white.png")
    logo_white.save(logo_white_path, "PNG")
    print(f"[OK] Saved pure white logo to: {logo_white_path}")

    # 3. Build Apparel Renders (T-Shirt, Polo, Hoodie)
    logo_w, logo_h = logo_white.size
    ratio = logo_w / logo_h

    garments = [
        {
            "name": "tshirt",
            "base_file": os.path.join(assets_dir, "tshirt-black-JHK170.png"),
            "output": os.path.join(project_public, "tshirt_dfazz_white_mockup.png"),
            "scale": 0.32,
            "y_offset": 0.30
        },
        {
            "name": "polo",
            "base_file": os.path.join(assets_dir, "polo-black-JHK510.png"),
            "output": os.path.join(project_public, "polo_dfazz_white_mockup.png"),
            "scale": 0.28,
            "y_offset": 0.35
        },
        {
            "name": "hoodie",
            "base_file": os.path.join(assets_dir, "hoodie-black-JHK421.png"),
            "output": os.path.join(project_public, "hoodie_dfazz_white_mockup.png"),
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

        logo_chest = logo_white.resize((chest_logo_w, chest_logo_h), Image.Resampling.LANCZOS)

        mockup = base_img.copy()
        posX = (base_img.width - chest_logo_w) // 2
        posY = int(base_img.height * g['y_offset'])

        mockup.paste(logo_chest, (posX, posY), logo_chest)
        mockup.save(g['output'], "PNG")
        print(f"[OK] Saved isolated {g['name']} white mockup to: {g['output']}")

if __name__ == "__main__":
    main()
