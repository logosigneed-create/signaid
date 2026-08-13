import { jsPDF } from "jspdf";

/**
 * Génère un fichier PDF multicalques (objets vectoriels/textes + image)
 * pour la carte de visite BTP.
 */
export async function generateBusinessCardPDF(
  companyName: string,
  activity: string,
  email: string,
  phone: string,
  logoDataUrl: string | null
): Promise<Blob> {
  // Créer un document PDF : paysage, millimètres, format standard carte 85x55 mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85, 55]
  });

  // --- CALQUE 1 : FOND NOIR ---
  doc.setFillColor(17, 17, 17); // #111111
  doc.rect(0, 0, 85, 55, 'F'); // Remplissage complet

  // --- CALQUE 2 : TEXTES (Nom de l'entreprise) ---
  doc.setTextColor(255, 255, 255); // Blanc
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const safeCompanyName = companyName || "ENTREPRISE BTP";
  // On limite la longueur pour éviter le dépassement
  doc.text(safeCompanyName.toUpperCase().substring(0, 30), 5, 8);

  // --- CALQUE 3 : TEXTES (Activité) ---
  doc.setTextColor(234, 88, 12); // Orange-600 (#ea580c)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text((activity || "CONSTRUCTION & RÉNOVATION").toUpperCase(), 5, 12);

  // --- CALQUE 4 : COORDONNÉES ---
  doc.setTextColor(150, 150, 150); // Gris
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(email || "contact@entreprise.com", 5, 48);
  doc.text(phone || "www.entreprise.com", 5, 51);

  // --- CALQUE 5 : LOGO HD ---
  if (logoDataUrl) {
    try {
      const imgProps = doc.getImageProperties(logoDataUrl);
      // Dimensions maximales allouées pour le logo (à droite de la carte)
      const logoMaxWidth = 35;
      const logoMaxHeight = 35;
      
      let logoWidth = logoMaxWidth;
      let logoHeight = (imgProps.height * logoMaxWidth) / imgProps.width;
      
      // Ajustement si le ratio rend l'image trop haute
      if (logoHeight > logoMaxHeight) {
        logoHeight = logoMaxHeight;
        logoWidth = (imgProps.width * logoMaxHeight) / imgProps.height;
      }
      
      // Positionnement : aligné à droite avec une marge de 5mm, centré verticalement
      const x = 85 - logoWidth - 5;
      const y = (55 - logoHeight) / 2;
      
      // Ajout de l'image (elle reste un objet indépendant dans le PDF)
      doc.addImage(logoDataUrl, 'PNG', x, y, logoWidth, logoHeight);
    } catch (e) {
      console.warn("Erreur lors de l'intégration du logo dans le PDF:", e);
    }
  }

  // Retourne le PDF sous forme de fichier binaire (Blob)
  return doc.output('blob');
}
