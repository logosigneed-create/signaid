import os
import glob
from PIL import Image

def inspect_image(filepath):
    try:
        img = Image.open(filepath)
        return img.size, img.mode
    except Exception as e:
        return None

search_paths = [
    r"c:\Partage\Projet\signaid-studio",
    r"c:\Partage\Projet\signaid-vitrine",
    r"C:\Users\Asus\.gemini\antigravity\brain"
]

found_images = []

for base in search_paths:
    for root, dirs, files in os.walk(base):
        if "node_modules" in root or ".git" in root or "dist" in root or ".next" in root:
            continue
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in ['.png', '.jpg', '.jpeg', '.svg', '.webp']:
                full_path = os.path.join(root, f)
                size_mode = inspect_image(full_path)
                if size_mode:
                    found_images.append((full_path, f, size_mode))

print(f"Total image files found: {len(found_images)}")
print("\n--- Image files list ---")
for full_path, name, (size, mode) in found_images:
    if any(k in name.lower() for k in ['dfazz', 'fazz', 'fabrizio', 'logo', 'audit', 'preset', 'media', 'user']):
        print(f"Name: {name} | Size: {size} | Path: {full_path}")
