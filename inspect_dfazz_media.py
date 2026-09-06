import os
from PIL import Image

image_files = [
    r"c:\Partage\Projet\signaid-studio\src\assets\logo-Cf4MRV8L.png",
    r"c:\Partage\Projet\signaid-studio\public\logo.png",
    r"c:\Partage\Projet\signaid-studio\public\assets\presets\card_dfazz.png",
    r"C:\Users\Asus\.gemini\antigravity\brain\288c9fb1-be90-4cbf-8187-57de988238c1\media__1785418332679.jpg",
    r"C:\Users\Asus\.gemini\antigravity\brain\288c9fb1-be90-4cbf-8187-57de988238c1\media__1779217905693.png"
]

for img_path in image_files:
    if os.path.exists(img_path):
        try:
            im = Image.open(img_path)
            print(f"File: {os.path.basename(img_path)} | Path: {img_path} | Size: {im.size} | Mode: {im.mode}")
        except Exception as e:
            print(f"Error reading {img_path}: {e}")
    else:
        print(f"Not found: {img_path}")
