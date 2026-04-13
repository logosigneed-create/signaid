
import os
from PIL import Image

directory = r"c:\Partage\Projet\Signaid V7\public\assets\ai_styles"
files = [f for f in os.listdir(directory) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

print(f"Found {len(files)} images to convert.")

for filename in files:
    if filename.lower().endswith('.webp'):
        continue
    
    filepath = os.path.join(directory, filename)
    name, ext = os.path.splitext(filename)
    new_filepath = os.path.join(directory, f"{name}.webp")
    
    try:
        with Image.open(filepath) as img:
            img.save(new_filepath, "WEBP", quality=85)
        print(f"Converted: {filename} -> {name}.webp")
        os.remove(filepath)
        print(f"Deleted original: {filename}")
    except Exception as e:
        print(f"Error converting {filename}: {e}")

print("Done.")
