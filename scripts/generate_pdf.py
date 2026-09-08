from playwright.sync_api import sync_playwright

# 1. XML Peppol
xml_path = r"c:\Users\Asus\Downloads\facture_FAC-2026-003_peppol.xml"
print("Checking XML at:", xml_path)

# 2. PDF Facture
html_content = """<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
@page { size: A4; margin: 20mm; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.4; font-size: 13px; }
.header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
.title { font-size: 24px; font-weight: 800; color: #2563eb; text-align: right; }
.meta { font-size: 12px; color: #64748b; margin-top: 4px; text-align: right; }
.parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
.box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; width: 46%; }
.box h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; }
table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 12px; color: #475569; border-bottom: 2px solid #cbd5e1; }
td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
.totals { display: flex; justify-content: flex-end; margin-bottom: 25px; }
.tot-table { width: 280px; }
.tot-table td { padding: 6px 10px; border: none; }
.tot-table tr.total td { font-size: 16px; font-weight: bold; color: #1e3a8a; border-top: 2px solid #2563eb; }
.payment { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 14px; margin-bottom: 20px; }
.legal { font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
</style></head>
<body>
<div class="header">
  <div>
    <h2 style="margin:0;color:#1e3a8a;">Nico Signaid</h2>
    <div>Rue sinton 27, 5070 Fosses-la-ville (Belgique)</div>
    <div><strong>TVA :</strong> BE 0786.527.864 | <strong>GSM :</strong> 0479 35 94 39</div>
  </div>
  <div>
    <div class="title">FACTURE</div>
    <div class="meta">
      <strong>Facture N° :</strong> FAC-2026-003<br>
      <strong>Date :</strong> 07/09/2026<br>
      <strong>Réf. Devis :</strong> DEV-2026-003
    </div>
  </div>
</div>
<div class="parties">
  <div class="box">
    <h4>Émetteur</h4>
    <strong>Nico Signaid</strong><br>
    BE 0786.527.864
  </div>
  <div class="box" style="border-left: 4px solid #2563eb;">
    <h4>Client</h4>
    <strong>Color Sol / ECS Services (Loïc Palkowski)</strong><br>
    238 route de Lille (ou 1 rue Lucie Aubrac)<br>
    62880 Annay, France<br>
    <strong>TVA :</strong> FR36 980370472 | <strong>SIREN :</strong> 980 370 472
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th style="text-align:center;width:12%;">Qté</th>
      <th style="text-align:right;width:18%;">Prix Unit. HT</th>
      <th style="text-align:right;width:18%;">Total HT</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <strong>Refonte logo</strong><br>
        <span style="font-size:11px;color:#64748b;">Analyse & fusion des identités visuelles, optimisation vectorielle et livraison des fichiers HD.</span>
      </td>
      <td style="text-align:center;">1</td>
      <td style="text-align:right;">100,00 €</td>
      <td style="text-align:right;">100,00 €</td>
    </tr>
  </tbody>
</table>
<div class="totals">
  <table class="tot-table">
    <tr><td style="text-align:right;">Total HT :</td><td style="text-align:right;">100,00 €</td></tr>
    <tr><td style="text-align:right;">TVA (0%) :</td><td style="text-align:right;">0,00 €</td></tr>
    <tr class="total"><td style="text-align:right;">TOTAL À PAYER :</td><td style="text-align:right;">100,00 €</td></tr>
  </table>
</div>
<div class="payment">
  <strong>Coordonnées bancaires :</strong><br>
  Compte IBAN : <strong>BE39 0634 4640 2119</strong><br>
  Communication : <strong>FAC-2026-003</strong><br>
  <span style="font-size:11px;color:#1e40af;"><em>Paiement 100% à la commande. Montant de 100,00 € déductible de la future facture textile 2026.</em></span>
</div>
<div class="legal">
  Régime particulier de franchise des petites entreprises (Article 56bis du Code TVA belge / Art. 293 B du CGI). TVA non applicable.
</div>
</body></html>"""

pdf_path = r"c:\Users\Asus\Downloads\facture_FAC-2026-003.pdf"
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_content(html_content)
    page.pdf(path=pdf_path, format="A4", print_background=True)
    browser.close()
print("PDF written to:", pdf_path)
