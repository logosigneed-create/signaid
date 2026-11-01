# 🎯 Guide de Scraping des Prospects Facebook Invites (Signaid)

Ce module permet d'extraire automatiquement l'ensemble des pages d'entreprises qui vous ont envoyé une invitation à aimer leur page sur Facebook :
👉 **URL cible** : [https://www.facebook.com/pages/?category=invites&ref=bookmarks](https://www.facebook.com/pages/?category=invites&ref=bookmarks)

---

## 💡 Pourquoi cette page est une mine d'or pour Signaid ?
Lorsque des entrepreneurs, artisans ou créateurs lancent une nouvelle activité (société de toiture, rénovation, salon de coiffure, restaurant, coach sportif, événementiel...), leur tout premier réflexe est de **créer une page Facebook et d'inviter leur réseau**.

Ces prospects sont en phase de **lancement immédiat** et ont un besoin urgent de :
- **T-shirts de travail / chantier floqués** (visibilité sur chantier)
- **Polos brodés pour les patrons et équipes de service**
- **Hoodies / Sweats à capuche avec logo**
- **Casquettes et vestes softshell professionnelles**

---

## 🚀 Méthode 1 : Extraction Directe 1-Clic via la Console (Recommandée)
Puisque Facebook exige que vous soyez connecté à votre compte et bloque les scrapers distants (comme Firecrawl / Cloudflare), cette méthode s'exécute directement dans votre onglet Facebook ouvert. C'est **100 % sécurisé, indétectable par Facebook et sans aucun risque pour votre compte**.

### Étapes :
1. Ouvrez votre page Facebook : [https://www.facebook.com/pages/?category=invites&ref=bookmarks](https://www.facebook.com/pages/?category=invites&ref=bookmarks)
2. Ouvrez la Console des Développeurs :
   - Appuyez sur **F12** (ou `Ctrl + Shift + I`), puis cliquez sur l'onglet **Console**.
3. Copiez l'intégralité du script contenu dans [scripts/facebook_invites_scraper.js](file:///c:/Partage/Projet/Signaid%20system/scripts/facebook_invites_scraper.js) et collez-le dans la console, puis appuyez sur **Entrée**.
4. **Le Widget Signaid s'affiche en bas à droite de votre écran** :
   - Il fait défiler la page automatiquement (auto-scroll fluide).
   - Il extrait le nom de l'entreprise, le lien Facebook direct, le logo haute définition, et l'inviteur.
   - Il qualifie le secteur et calcule les besoins textiles recommandés.
5. Cliquez sur :
   - **📥 Télécharger CSV** : Télécharge un fichier CSV encodé UTF-8 compatible Excel.
   - **🚀 Vers Signaid** : Envoie directement les prospects dans votre projet Signaid (nécessite le serveur ci-dessous).

---

## ⚡ Synchronisation en direct avec le projet Signaid

Pour recevoir les prospects extraits directement dans votre projet Signaid sans manipulation manuelle :

1. Dans un terminal, lancez le serveur de synchronisation :
```powershell
node scripts/sync_fb_prospects.cjs
```
2. Sur la page Facebook dans le widget Signaid, cliquez simplement sur **🚀 Vers Signaid**.
3. Les données sont automatiquement créées et enrichies :
   - Fichier JSON complet : `facebook_prospects_invites.json`
   - Fichier CSV dédié : `prospect_links_facebook.csv`
   - Fusion automatique dans : `prospect_links.csv` avec génération de clés d'audit uniques (`audit-[nom]-[id]`).

---

## 🤖 Méthode 2 : Scraper Autonome Playwright (Python)

Si vous préférez exécuter un navigateur automatisé dédié :
```powershell
python scripts/scrape_fb_playwright.py
```
- Le script ouvre une fenêtre Chrome avec une session persistante (`~/.facebook_playwright_session`).
- Il navigue vers la page d'invitations, fait défiler et enregistre automatiquement les fichiers `facebook_prospects_invites.json` et `prospect_links_facebook.csv`.

---

## 📊 Format des Données Extraites

Chaque prospect extrait dispose de la structure suivante :

| Champ | Description | Exemple |
| :--- | :--- | :--- |
| **Nom Entreprise** | Raison sociale / Nom de la Page | `"Ardenne Toitures"` |
| **Cle Audit** | Identifiant unique vitrine Signaid | `"audit-ardennetoiture-7k9a"` |
| **Lien Facebook** | URL directe vers la page | `"https://www.facebook.com/ardennetoitures"` |
| **Secteur d'activité** | Métier qualifié automatiquement | `"Toitures & Rénovation"` |
| **Nom Inviteur** | Personne ayant envoyé l'invitation | `"Invité(e) par Marc Dupont"` |
| **Besoins Textiles** | Recommandations de flocage | `"Hoodies chauds, T-shirts de chantier, Polos"` |
| **Logo URL** | Image haute définition pour les mockups | `"https://scontent...fbcdn.net/..."` |
