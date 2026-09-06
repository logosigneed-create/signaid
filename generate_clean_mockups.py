import os
from PIL import Image, ImageOps, ImageDraw

def main():
    brain_dir = r"C:\Users\Asus\.gemini\antigravity\brain\288c9fb1-be90-4cbf-8187-57de988238c1"
    project_public = r"c:\Partage\Projet\signaid-studio\public"
    assets_dir = r"c:\Partage\Projet\signaid-studio\public\assets"
    
    # 1. Logo base
    logo_path = os.path.join(brain_dir, "test_logo_original.png")
    if not os.path.exists(logo_path):
        logo_path = os.path.join(brain_dir, "test_logo_selective_white.png")
    
    print(f"Loading logo from: {logo_path}")
    logo = Image.open(logo_path).convert("RGBA")
    
    # Ensure logo is clean and contrasty on a white background for avatar
    # Create avatar logo (white background padding)
    avatar_w, avatar_h = 512, 512
    avatar_bg = Image.new("RGBA", (avatar_w, avatar_h), (255, 255, 255, 255))
    
    logo_ratio = logo.width / logo.height
    target_logo_w = 400
    target_logo_h = int(target_logo_w / logo_ratio)
    if target_logo_h > 400:
        target_logo_h = 400
        target_logo_w = int(target_logo_h * logo_ratio)
        
    logo_resized = logo.resize((target_logo_w, target_logo_h), Image.Resampling.LANCZOS)
    pos_x = (avatar_w - target_logo_w) // 2
    pos_y = (avatar_h - target_logo_h) // 2
    avatar_bg.paste(logo_resized, (pos_x, pos_y), logo_resized)
    
    avatar_path = os.path.join(project_public, "logo_dfazz_official.png")
    avatar_bg.save(avatar_path, "PNG")
    print(f"[OK] Saved clean official logo avatar to: {avatar_path}")
    
    # 2. Mockups generation
    garments = [
        {
            "name": "tshirt",
            "base_file": os.path.join(assets_dir, "tshirt-black-JHK170.png"),
            "output": os.path.join(project_public, "tshirt_dfazz_mockup.png"),
            "scale": 0.28,
            "y_offset": 0.30
        },
        {
            "name": "polo",
            "base_file": os.path.join(assets_dir, "polo-black-JHK510.png"),
            "output": os.path.join(project_public, "polo_dfazz_mockup.png"),
            "scale": 0.25,
            "y_offset": 0.35
        },
        {
            "name": "hoodie",
            "base_file": os.path.join(assets_dir, "hoodie-black-JHK421.png"),
            "output": os.path.join(project_public, "hoodie_dfazz_mockup.png"),
            "scale": 0.26,
            "y_offset": 0.36
        }
    ]
    
    for g in garments:
        print(f"\nProcessing {g['name']} mockup from {g['base_file']}...")
        if not os.path.exists(g['base_file']):
            print(f"[ERROR] Base file not found: {g['base_file']}")
            continue
            
        base_img = Image.open(g['base_file']).convert("RGBA")
        
        # Calculate size for chest logo
        chest_logo_w = int(base_img.width * g['scale'])
        chest_logo_h = int(chest_logo_w / logo_ratio)
        
        logo_chest = logo.resize((chest_logo_w, chest_logo_h), Image.Resampling.LANCZOS)
        
        mockup = base_img.copy()
        posX = (base_img.width - chest_logo_w) // 2
        posY = int(base_img.height * g['y_offset'])
        
        mockup.paste(logo_chest, (posX, posY), logo_chest)
        mockup.save(g['output'], "PNG")
        print(f"[OK] Saved isolated {g['name']} mockup to: {g['output']}")

if __name__ == "__main__":
    main()
