
import pandas as pd
import json
import os
import shutil
import re

# --- CONFIGURATION ---
SOURCE_EXCEL = r"c:\Partage\Projet\smart-garment-quote-&-invoice-builder\products_complete.xlsx"
SOURCE_IMAGES_DIR = r"c:\Partage\Projet\smart-garment-quote-&-invoice-builder\Catalogue_Genere"

# Output for React app
OUTPUT_JSON = r"public\imported_catalog.json"
OUTPUT_IMAGES_DIR = r"public\imported_products"

# Color Mapping (Name -> Hex)
COLOR_MAP = {
    "black": "#000000", "noir": "#000000",
    "white": "#FFFFFF", "blanc": "#FFFFFF",
    "red": "#FF0000", "rouge": "#FF0000",
    "blue": "#0000FF", "bleu": "#0000FF",
    "royal blue": "#4169E1", "bleu royal": "#4169E1",
    "navy": "#000080", "marine": "#000080", "bleu marine": "#000080",
    "green": "#008000", "vert": "#008000",
    "forest green": "#228B22", "vert bouteille": "#228B22",
    "kelly green": "#4CBB17",
    "yellow": "#FFFF00", "jaune": "#FFFF00",
    "gold": "#FFD700", "or": "#FFD700",
    "orange": "#FFA500",
    "grey": "#808080", "gris": "#808080",
    "heather grey": "#D3D3D3", "gris chiné": "#D3D3D3",
    "dark grey": "#A9A9A9", "gris foncé": "#A9A9A9",
    "pink": "#FFC0CB", "rose": "#FFC0CB",
    "fuchsia": "#FF00FF",
    "purple": "#800080", "violet": "#800080",
    "brown": "#A52A2A", "marron": "#A52A2A",
    "beige": "#F5F5DC", "natural": "#FAF0BE", "sand": "#C2B280",
    "sky blue": "#87CEEB", "ciel": "#87CEEB", "bleu ciel": "#87CEEB",
    "bottle green": "#006A4E"
}

def safe_name(n):
    return str(n).replace('/', '_').strip()

def get_hex_from_name(name):
    if not name or pd.isna(name): return "#000000"
    n = str(name).lower().strip()
    if n in COLOR_MAP: return COLOR_MAP[n]
    # Try finding logic
    for k, v in COLOR_MAP.items():
        if k in n: return v
    return "#000000" # Fallback

def main():
    print(f"Reading {SOURCE_EXCEL}...")
    try:
        df = pd.read_excel(SOURCE_EXCEL)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return

    # Normalize columns
    col_map = {str(c).lower().strip(): c for c in df.columns}
    col_ref = col_map.get("n° art")
    col_price = None
    for k in col_map:
        if "pièce" in k or "prix" in k:
            if "carton" not in k:
                col_price = col_map[k]
                break
    col_color = col_map.get("couleur")
    col_size = col_map.get("taille")
    col_name = col_map.get("produit")

    if not col_ref:
        print("Error: Could not find Reference column (N° art)")
        return

    # Prepare Output Dir
    if not os.path.exists(OUTPUT_IMAGES_DIR):
        os.makedirs(OUTPUT_IMAGES_DIR)

    products = {}

    print("Processing rows...")
    for index, row in df.iterrows():
        ref = row[col_ref]
        if pd.isna(ref): continue
        slug = safe_name(ref)

        if slug not in products:
            # Initialize Product
            name = row.get(col_name, f"Product {slug}")
            # Identify Price
            raw_price = 0
            if col_price and pd.notna(row[col_price]):
                try:
                    p_str = str(row[col_price]).replace("€", "").replace(",", ".").replace("\xa0", "").strip()
                    raw_price = float(p_str)
                except: pass
            
            # Base Product Object
            products[slug] = {
                "name": str(name).strip(),
                "price": raw_price, # HT Price
                "sizes": set(),
                "images": {},     # { Hex: URL }
                "backImages": {},
                "slideImage": ""
            }

        prod = products[slug]
        
        # Add Size
        if col_size:
            s_val = str(row[col_size]).strip()
            if s_val and s_val.lower() != "nan":
                prod["sizes"].add(s_val)

        # Add Image (Color)
        if col_color:
            color_name = str(row[col_color]).strip()
            if not color_name or color_name.lower() == "nan": color_name = "Default"
            
            hex_code = get_hex_from_name(color_name)
            
            # Check for image source
            # Look in Catalogue_Genere/REF/COLOR/SIZE/image.jpg
            # Use the current row's size
            size_name_folder = safe_name(row.get(col_size, "Unknown"))
            color_name_folder = safe_name(color_name)
            
            found_img = False
            src_path = os.path.join(SOURCE_IMAGES_DIR, slug, color_name_folder, size_name_folder, "image_custom.jpg")
            
            # Fallback names
            if not os.path.exists(src_path):
                src_path = os.path.join(SOURCE_IMAGES_DIR, slug, color_name_folder, size_name_folder, "image.jpg")

            if os.path.exists(src_path):
                # Copy to public/imported_products/slug_hex.jpg
                # We normalize hex to remove # for filename
                clean_hex = hex_code.replace("#", "")
                dest_filename = f"{slug}_{clean_hex}.jpg"
                dest_path = os.path.join(OUTPUT_IMAGES_DIR, dest_filename)
                
                shutil.copy2(src_path, dest_path)
                
                # Set URL (Relative to public)
                # /imported_products/filename.jpg
                prod["images"][hex_code] = f"/imported_products/{dest_filename}"
                
                if not prod["slideImage"]:
                    prod["slideImage"] = f"/imported_products/{dest_filename}"
            else:
                pass
                # print(f"  Missing image for {slug} {color_name}")

    # Finalize
    print("Finalizing data...")
    final_db = {}
    for slug, p in products.items():
        final_db[slug] = {
            "name": p["name"],
            "price": p["price"],
            "sizes": sorted(list(p["sizes"])),
            "images": p["images"],
            "backImages": p["backImages"], # Empty for now
            "slideImage": p["slideImage"]
        }

    # Write JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(final_db, f, indent=2, ensure_ascii=False)

    print(f"Done! Exported {len(final_db)} products to {OUTPUT_JSON}")
    print(f"Images copied to {OUTPUT_IMAGES_DIR}")

if __name__ == "__main__":
    main()
