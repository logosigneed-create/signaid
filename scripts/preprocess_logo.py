import cv2
import numpy as np
import sys
import os

def preparer_logo_pour_ia(input_path, output_path):
    # Charger l'image
    img = cv2.imread(input_path)
    if img is None:
        print(f"Erreur: Impossible de lire l'image à {input_path}")
        return

    # 1. Suppression du bruit chromatique (les petites taches de couleur)
    # h=10, hColor=10, templateWindowSize=7, searchWindowSize=21
    denoised = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)

    # 2. Passage en Noir et Blanc strict pour "tuer" les pixels gris/sales
    gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
    
    # On applique un flou léger pour lisser les crénelages avant l'IA
    blurred = cv2.GaussianBlur(gray, (3,3), 0)
    
    # On force le contraste (Seuil adaptatif ou strict)
    # User requested threshold 200 -> 255
    _, clean_logo = cv2.threshold(blurred, 200, 255, cv2.THRESH_BINARY)

    # Sauvegarder avant l'étape IA
    cv2.imwrite(output_path, clean_logo)
    print("Image prête pour le traitement IA.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python preprocess_logo.py <input> <output>")
    else:
        preparer_logo_pour_ia(sys.argv[1], sys.argv[2])
