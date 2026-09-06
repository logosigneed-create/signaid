import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_dfazz_stylized_logo():
    # High-resolution canvas for logo
    width, height = 1000, 400
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Try loading a bold futuristic/sans font or fallback to default with drawing
    try:
        # Load standard truetype font if available
        font_main = ImageFont.truetype("arial.ttf", 110)
        font_sub = ImageFont.truetype("arial.ttf", 40)
    except:
        font_main = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # Create stylized metallic white/silver logo text "D-FAZZ"
    text_main = "D-FAZZ"
    text_sub = "DEEJAY OFFICIAL"

    # Draw glow & outline
    # Draw crisp white text with sleek electro accents
    # We will draw a sleek vector logo for D-FAZZ
    
    # Calculate bounding boxes
    bbox_m = draw.textbbox((0, 0), text_main, font=font_main)
    w_m, h_m = bbox_m[2] - bbox_m[0], bbox_m[3] - bbox_m[1]
    
    bbox_s = draw.textbbox((0, 0), text_sub, font=font_sub)
    w_s, h_s = bbox_s[2] - bbox_s[0], bbox_s[3] - bbox_s[1]

    x_m = (width - w_m) // 2
    y_m = (height - h_m) // 2 - 25

    x_s = (width - w_s) // 2
    y_s = y_m + h_m + 35

    # Draw soundwave/electro bar accent lines top and bottom
    bar_w = int(w_m * 1.1)
    bar_x = (width - bar_w) // 2
    
    # Top line
    draw.line([(bar_x, y_m - 20), (bar_x + bar_w, y_m - 20)], fill=(255, 255, 255, 255), width=5)
    # Bottom line
    draw.line([(bar_x, y_s + h_s + 15), (bar_x + bar_w, y_s + h_s + 15)], fill=(56, 189, 248, 255), width=4)

    # Draw main text in pure white
    draw.text((x_m, y_m), text_main, font=font_main, fill=(255, 255, 255, 255))
    # Draw sub text in sky blue accent #38bdf8
    draw.text((x_s, y_s), text_sub, font=font_sub, fill=(56, 189, 248, 255))

    return img

def main():
    project_public = r"c:\Partage\Projet\signaid-studio\public"
    assets_dir = r"c:\Partage\Projet\signaid-studio\public\assets"

    logo_img = create_dfazz_stylized_logo()
    
    # Save transparent logo
    logo_path = os.path.join(project_public, "logo_dfazz_transparent.png")
    logo_img.save(logo_path, "PNG")
    print(f"[OK] Saved transparent D-FAZZ logo to: {logo_path}")

    # Save avatar logo (white background)
    avatar = Image.new("RGBA", (600, 600), (255, 255, 255, 255))
    # Paste logo in center with dark container padding
    bg_circle = Image.new("RGBA", (520, 520), (15, 23, 42, 255)) # Dark navy contrast container
    
    logo_ratio = logo_img.width / logo_img.height
    w_res = 440
    h_res = int(w_res / logo_ratio)
    logo_resized = logo_img.resize((w_res, h_res), Image.Resampling.LANCZOS)
    
    bg_circle.paste(logo_resized, ((520 - w_res) // 2, (520 - h_res) // 2), logo_resized)
    avatar.paste(bg_circle, (40, 40))
    
    avatar_path = os.path.join(project_public, "logo_dfazz_avatar_clean.png")
    avatar.save(avatar_path, "PNG")
    print(f"[OK] Saved avatar D-FAZZ logo to: {avatar_path}")

    # Mockups generation
    garments = [
        {
            "name": "tshirt",
            "base_file": os.path.join(assets_dir, "tshirt-black-JHK170.png"),
            "output": os.path.join(project_public, "tshirt_dfazz_isolated.png"),
            "scale": 0.32,
            "y_offset": 0.30
        },
        {
            "name": "polo",
            "base_file": os.path.join(assets_dir, "polo-black-JHK510.png"),
            "output": os.path.join(project_public, "polo_dfazz_isolated.png"),
            "scale": 0.28,
            "y_offset": 0.35
        },
        {
            "name": "hoodie",
            "base_file": os.path.join(assets_dir, "hoodie-black-JHK421.png"),
            "output": os.path.join(project_public, "hoodie_dfazz_isolated.png"),
            "scale": 0.30,
            "y_offset": 0.36
        }
    ]

    for g in garments:
        if not os.path.exists(g['base_file']):
            print(f"[ERROR] Base file not found: {g['base_file']}")
            continue

        base_img = Image.open(g['base_file']).convert("RGBA")
        chest_logo_w = int(base_img.width * g['scale'])
        chest_logo_h = int(chest_logo_w / logo_ratio)

        logo_chest = logo_img.resize((chest_logo_w, chest_logo_h), Image.Resampling.LANCZOS)

        mockup = base_img.copy()
        posX = (base_img.width - chest_logo_w) // 2
        posY = int(base_img.height * g['y_offset'])

        mockup.paste(logo_chest, (posX, posY), logo_chest)
        mockup.save(g['output'], "PNG")
        print(f"[OK] Saved isolated {g['name']} mockup with D-FAZZ logo to: {g['output']}")

if __name__ == "__main__":
    main()
