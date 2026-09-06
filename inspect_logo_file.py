import os
from PIL import Image

def analyze(path):
    img = Image.open(path)
    print(f"\n--- Analyzing {os.path.basename(path)} ---")
    print("Format:", img.format)
    print("Size:", img.size)
    print("Mode:", img.mode)
    # Check bounding box of non-zero alpha
    if img.mode == 'RGBA':
        bbox = img.getbbox()
        print("Non-empty bbox:", bbox)

analyze(r"c:\Partage\Projet\signaid-studio\src\assets\logo-Cf4MRV8L.png")
analyze(r"C:\Users\Asus\.gemini\antigravity\brain\288c9fb1-be90-4cbf-8187-57de988238c1\media__1779217905693.png")
